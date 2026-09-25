import { createSlice } from '@reduxjs/toolkit';

// Live state of the interview room the user is currently in.
// The editor text itself is NOT stored here (it changes on every keystroke);
// only *remote* updates pass through so the editor can apply them.
const initialState = {
  connected: false,
  joined: false,
  role: null,
  status: null, // scheduled | in-progress | completed
  startedAt: null,
  endedAt: null,
  durationMinutes: null,
  candidateOnline: false,
  candidateTyping: false,
  interviewerTyping: false,
  currentQuestionId: null,
  currentQuestion: null,
  initialCode: '',
  language: 'javascript',
  remoteCode: { code: '', version: 0 },
  messages: [],
  submissions: [],
  submitting: false,
  running: false,
  runResult: null,
};

const slice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    resetRoom: () => initialState,
    connectionChanged(state, { payload }) {
      state.connected = payload;
    },
    roomJoined(state, { payload }) {
      const rejoin = state.joined;
      state.joined = true;
      state.role = payload.role;
      state.status = payload.status;
      state.startedAt = payload.startedAt;
      state.endedAt = payload.endedAt;
      state.durationMinutes = payload.durationMinutes;
      state.candidateOnline = payload.candidateOnline;
      state.currentQuestion = payload.currentQuestion;
      state.currentQuestionId = payload.currentQuestion?._id ?? null;
      state.language = payload.language;
      if (!rejoin) {
        state.initialCode = payload.code || '';
      } else if (payload.code) {
        // Reconnected: catch up with whatever happened while we were away.
        state.remoteCode = { code: payload.code, version: state.remoteCode.version + 1 };
      }
    },
    messagesLoaded(state, { payload }) {
      // History from REST, merged with anything that arrived live in the meantime.
      const known = new Set(payload.map((m) => m._id));
      state.messages = [...payload, ...state.messages.filter((m) => !known.has(m._id))];
    },
    messageReceived(state, { payload }) {
      if (!state.messages.some((m) => m._id === payload._id)) state.messages.push(payload);
    },
    submissionsLoaded(state, { payload }) {
      const known = new Set(payload.map((s) => s._id));
      state.submissions = [...state.submissions.filter((s) => !known.has(s._id)), ...payload].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );
    },
    submissionReceived(state, { payload }) {
      state.submitting = false;
      if (!state.submissions.some((s) => s._id === payload._id)) state.submissions.unshift(payload);
    },
    submitStarted(state) {
      state.submitting = true;
    },
    submitFinished(state) {
      state.submitting = false;
    },
    runStarted(state) {
      state.running = true;
    },
    runFinished(state, { payload }) {
      state.running = false;
      state.runResult = payload || null;
    },
    questionReceived(state, { payload }) {
      state.currentQuestion = payload;
      state.currentQuestionId = payload._id;
      state.runResult = null;
    },
    codeUpdated(state, { payload }) {
      state.language = payload.language;
      state.remoteCode = { code: payload.code, version: state.remoteCode.version + 1 };
    },
    languageChanged(state, { payload }) {
      state.language = payload;
    },
    typingChanged(state, { payload: { who, isTyping } }) {
      if (who === 'candidate') state.candidateTyping = isTyping;
      else state.interviewerTyping = isTyping;
    },
    presenceChanged(state, { payload }) {
      state.candidateOnline = payload;
      if (!payload) state.candidateTyping = false;
    },
    interviewStarted(state, { payload }) {
      state.status = 'in-progress';
      state.startedAt = payload.startedAt;
      state.durationMinutes = payload.durationMinutes;
    },
    interviewEnded(state, { payload }) {
      state.status = 'completed';
      state.endedAt = payload.endedAt;
    },
  },
});

export const {
  resetRoom,
  connectionChanged,
  roomJoined,
  messagesLoaded,
  messageReceived,
  submissionsLoaded,
  submissionReceived,
  submitStarted,
  submitFinished,
  runStarted,
  runFinished,
  questionReceived,
  codeUpdated,
  languageChanged,
  typingChanged,
  presenceChanged,
  interviewStarted,
  interviewEnded,
} = slice.actions;

export default slice.reducer;
