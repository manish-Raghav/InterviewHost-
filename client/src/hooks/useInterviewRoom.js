import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket.js';
import {
  codeUpdated,
  connectionChanged,
  interviewEnded,
  interviewStarted,
  messageReceived,
  messagesLoaded,
  presenceChanged,
  questionReceived,
  resetRoom,
  roomJoined,
  runFinished,
  runStarted,
  submissionReceived,
  submissionsLoaded,
  submitFinished,
  submitStarted,
  typingChanged,
} from '../features/room/roomSlice.js';

/**
 * Connects to Socket.IO, joins the interview's private room, keeps the Redux `room` slice in
 * sync with server events and returns the functions the UI uses to emit events.
 */
export default function useInterviewRoom(interviewId) {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const role = useSelector((s) => s.auth.user?.role);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    const socket = connectSocket(token);
    setJoinError(null);

    // (Re)join on every connect so a dropped connection recovers automatically.
    const join = () =>
      socket.emit('join-interview', { interviewId }, (res) => {
        if (!res?.ok) return setJoinError(res?.error || 'Could not join this interview');
        setJoinError(null);
        dispatch(roomJoined(res.state));
      });

    const handlers = {
      connect: () => {
        dispatch(connectionChanged(true));
        join();
      },
      disconnect: () => dispatch(connectionChanged(false)),
      connect_error: (err) => setJoinError(err.message || 'Could not connect to the server'),
      'receive-message': (m) => dispatch(messageReceived(m)),
      'receive-question': ({ question }) => dispatch(questionReceived(question)),
      'code-update': (p) => dispatch(codeUpdated(p)),
      'candidate-typing': ({ isTyping }) => dispatch(typingChanged({ who: 'candidate', isTyping })),
      'interviewer-typing': ({ isTyping }) => dispatch(typingChanged({ who: 'interviewer', isTyping })),
      'candidate-online': () => dispatch(presenceChanged(true)),
      'candidate-offline': () => dispatch(presenceChanged(false)),
      'start-interview': (p) => {
        dispatch(interviewStarted(p));
        toast('The interview has started');
      },
      'end-interview': (p) => {
        dispatch(interviewEnded(p));
        toast('The interview has ended');
      },
      'submission-result': (s) => dispatch(submissionReceived(s)),
    };
    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));

    // Chat history and earlier submissions come from the REST API.
    Promise.all([api.get(`/interviews/${interviewId}/messages`), api.get(`/interviews/${interviewId}/submissions`)])
      .then(([messages, submissions]) => {
        dispatch(messagesLoaded(messages.data.messages));
        dispatch(submissionsLoaded(submissions.data.submissions));
      })
      .catch(() => {});

    return () => {
      socket.emit('leave-interview');
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
      disconnectSocket();
      dispatch(resetRoom());
    };
  }, [interviewId, token, dispatch]);

  const actions = useMemo(() => {
    const emit = (event, payload, ack) => getSocket()?.emit(event, payload, ack);
    const report = (res) => {
      if (!res?.ok) toast.error(res?.error || 'Something went wrong');
    };

    return {
      sendMessage: (message) => emit('send-message', { message }, report),
      sendQuestion: (questionId) => emit('send-question', { questionId }, report),
      // Convenience for the common case: the interviewer picks a question to send before
      // ever clicking "Start interview". This starts the interview first, then sends the
      // question, in one click — instead of leaving Send silently disabled until they find
      // the separate Start interview button.
      startAndSendQuestion: (questionId) =>
        emit('start-interview', {}, (res) => {
          if (!res?.ok) return report(res);
          emit('send-question', { questionId }, report);
        }),
      startInterview: () => emit('start-interview', {}, report),
      endInterview: () => emit('end-interview', {}, report),
      emitCodeChange: (code, language) => emit('code-change', { code, language }),
      emitTyping: (isTyping) => emit(`${role}-typing`, { isTyping }),
      submitCode: (payload) => {
        if (!getSocket()?.connected) return toast.error('You are offline. Reconnecting…');
        dispatch(submitStarted());
        emit('submit-code', payload, (res) => {
          if (!res?.ok) {
            toast.error(res?.error || 'Submission failed');
            dispatch(submitFinished());
          }
        });
      },
      runCode: (payload) => {
        if (!getSocket()?.connected) return toast.error('You are offline. Reconnecting…');
        dispatch(runStarted());
        emit('run-code', payload, (res) => {
          if (!res?.ok) {
            toast.error(res?.error || 'Could not run your code');
            dispatch(runFinished(null));
            return;
          }
          dispatch(runFinished(res.result));
        });
      },
    };
  }, [dispatch, role]);

  return { actions, joinError };
}
