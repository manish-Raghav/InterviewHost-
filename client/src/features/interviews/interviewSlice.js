import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { getErrorMessage } from '../../services/api.js';

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  });

export const fetchInterviews = thunk('interviews/fetchAll', async () => (await api.get('/interviews')).data.interviews);
export const fetchInterview = thunk('interviews/fetchOne', async (id) => (await api.get(`/interviews/${id}`)).data.interview);
export const createInterview = thunk('interviews/create', async (body) => (await api.post('/interviews', body)).data.interview);
export const cancelInterview = thunk('interviews/cancel', async (id) => (await api.put(`/interviews/${id}`, { status: 'cancelled' })).data.interview);
export const addQuestionToInterview = thunk(
  'interviews/addQuestion',
  async ({ id, questionId }) => (await api.post(`/interviews/${id}/questions`, { questionId })).data.interview
);
export const removeQuestionFromInterview = thunk(
  'interviews/removeQuestion',
  async ({ id, questionId }) => (await api.delete(`/interviews/${id}/questions/${questionId}`)).data.interview
);
export const deleteInterview = thunk('interviews/delete', async (id) => {
  await api.delete(`/interviews/${id}`);
  return id;
});

const slice = createSlice({
  name: 'interviews',
  initialState: {
    items: [],
    listStatus: 'idle', // idle | loading | failed
    current: null,
    currentStatus: 'idle',
    currentError: null,
  },
  reducers: {
    clearCurrent(state) {
      state.current = null;
      state.currentStatus = 'idle';
      state.currentError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterviews.pending, (state) => {
        state.listStatus = 'loading';
      })
      .addCase(fetchInterviews.fulfilled, (state, { payload }) => {
        state.listStatus = 'idle';
        state.items = payload;
      })
      .addCase(fetchInterviews.rejected, (state) => {
        state.listStatus = 'failed';
      })
      .addCase(fetchInterview.pending, (state) => {
        state.currentStatus = 'loading';
        state.currentError = null;
      })
      .addCase(fetchInterview.fulfilled, (state, { payload }) => {
        state.currentStatus = 'idle';
        state.current = payload;
      })
      .addCase(fetchInterview.rejected, (state, { payload }) => {
        state.currentStatus = 'failed';
        state.currentError = payload;
      })
      .addCase(createInterview.fulfilled, (state, { payload }) => {
        state.items.unshift(payload);
      })
      .addCase(cancelInterview.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((x) => x._id === payload._id);
        if (i !== -1) state.items[i] = payload;
      })
      .addCase(deleteInterview.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((x) => x._id !== payload);
      })
      .addCase(addQuestionToInterview.fulfilled, (state, { payload }) => {
        if (state.current?._id === payload._id) state.current = payload;
      })
      .addCase(removeQuestionFromInterview.fulfilled, (state, { payload }) => {
        if (state.current?._id === payload._id) state.current = payload;
      });
  },
});

export const { clearCurrent } = slice.actions;
export default slice.reducer;
