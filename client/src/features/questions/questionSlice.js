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

export const fetchQuestions = thunk('questions/fetchAll', async () => (await api.get('/questions')).data.questions);


export const saveQuestion = thunk('questions/save', async ({ _id, ...body }) =>
  _id ? (await api.put(`/questions/${_id}`, body)).data.question : (await api.post('/questions', body)).data.question
);

export const deleteQuestion = thunk('questions/delete', async (id) => {
  await api.delete(`/questions/${id}`);
  return id;
});

const slice = createSlice({
  name: 'questions',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchQuestions.fulfilled, (state, { payload }) => {
        state.status = 'idle';
        state.items = payload;
      })
      .addCase(fetchQuestions.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(saveQuestion.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((q) => q._id === payload._id);
        if (i === -1) state.items.unshift(payload);
        else state.items[i] = payload;
      })
      .addCase(deleteQuestion.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((q) => q._id !== payload);
      });
  },
});

export default slice.reducer;
