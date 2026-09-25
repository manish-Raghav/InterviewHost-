import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Spinner from '../components/Spinner.jsx';
import CallBar from '../components/room/CallBar.jsx';
import ChatPanel from '../components/room/ChatPanel.jsx';
import CodeWorkspace from '../components/room/CodeWorkspace.jsx';
import QuestionPanel from '../components/room/QuestionPanel.jsx';
import RoomHeader from '../components/room/RoomHeader.jsx';
import {
  addQuestionToInterview,
  clearCurrent,
  fetchInterview,
  removeQuestionFromInterview,
} from '../features/interviews/interviewSlice.js';
import { fetchQuestions } from '../features/questions/questionSlice.js';
import useCall from '../hooks/useCall.js';
import useInterviewRoom from '../hooks/useInterviewRoom.js';

function Notice({ title, message }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="panel max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <Link to="/" className="btn btn-secondary mt-5">
          Back to interviews
        </Link>
      </div>
    </div>
  );
}

export default function InterviewRoom() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { current: interview, currentStatus, currentError } = useSelector((s) => s.interviews);
  const room = useSelector((s) => s.room);
  const bank = useSelector((s) => s.questions.items);
  const { actions, joinError } = useInterviewRoom(id);
  const { call, localStream, remoteStream, callActions } = useCall();

  useEffect(() => {
    dispatch(fetchInterview(id));
    return () => {
      dispatch(clearCurrent());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (user.role === 'interviewer') dispatch(fetchQuestions());
  }, [dispatch, user.role]);

  if (currentStatus === 'failed') return <Notice title="Can't open this interview" message={currentError} />;
  if (joinError && !room.joined) return <Notice title="Can't join the room" message={joinError} />;
  if (!interview || interview._id !== id) return <Spinner full />;

  const role = user.role;
  const status = room.status || interview.status;
  const other = role === 'interviewer' ? interview.candidate : interview.interviewer;
  const otherTyping = role === 'interviewer' ? room.candidateTyping : room.interviewerTyping;
  const questions = interview.questions || [];

  // The interviewer sees the full question (with hidden tests + notes) from the REST payload.
  const currentQuestion =
    role === 'interviewer'
      ? questions.find((q) => q._id === room.currentQuestionId) || room.currentQuestion
      : room.currentQuestion;

  const titleFor = (questionId) =>
    questions.find((q) => q._id === questionId)?.title ||
    (room.currentQuestion?._id === questionId ? room.currentQuestion.title : null);

  return (
    <div className="flex h-full flex-col">
      <RoomHeader interview={interview} room={room} role={role} actions={actions} call={call} callActions={callActions} />
      <CallBar call={call} localStream={localStream} remoteStream={remoteStream} callActions={callActions} otherName={other?.name} />

      {!room.joined ? (
        <Spinner full label="Joining room" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-paper lg:grid lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:gap-px lg:overflow-hidden">
          <div className="min-h-[300px] bg-white lg:min-h-0">
            <QuestionPanel
              role={role}
              questions={questions}
              currentQuestion={currentQuestion}
              currentQuestionId={room.currentQuestionId}
              status={status}
              actions={actions}
              bank={bank}
              onAttach={(questionId) => dispatch(addQuestionToInterview({ id: interview._id, questionId }))}
              onRemove={(questionId) => dispatch(removeQuestionFromInterview({ id: interview._id, questionId }))}
            />
          </div>

          <div className="min-h-[600px] bg-white lg:min-h-0">
            <CodeWorkspace
              role={role}
              room={room}
              status={status}
              currentQuestion={currentQuestion}
              actions={actions}
              titleFor={titleFor}
            />
          </div>

          <div className="min-h-[360px] bg-white lg:min-h-0">
            <ChatPanel
              messages={room.messages}
              currentUserId={user._id}
              otherName={other?.name}
              otherTyping={otherTyping}
              disabled={status === 'completed'}
              actions={actions}
            />
          </div>
        </div>
      )}
    </div>
  );
}
