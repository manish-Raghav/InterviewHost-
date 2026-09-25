import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import interviewReducer from '../features/interviews/interviewSlice.js';
import questionReducer from '../features/questions/questionSlice.js';
import roomReducer from '../features/room/roomSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    interviews: interviewReducer,
    questions: questionReducer,
    room: roomReducer,
  },
});
