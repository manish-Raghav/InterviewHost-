import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { getErrorMessage, TOKEN_KEY } from '../../services/api.js';

const persist = (token) => localStorage.setItem(TOKEN_KEY, token);

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    persist(data.token);
    return data;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const loginUser = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    persist(data.token);
    return data;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

const slice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    status: 'idle', // idle | loading | failed
    error: null,
  },
  reducers: {
    loggedOut(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = 'loading';
      state.error = null;
    };
    const authed = (state, { payload }) => {
      state.status = 'idle';
      state.user = payload.user;
      state.token = payload.token;
    };
    const failed = (state, { payload }) => {
      state.status = 'failed';
      state.error = payload;
    };

    builder
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, authed)
      .addCase(registerUser.rejected, failed)
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, authed)
      .addCase(loginUser.rejected, failed)
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.status = 'idle';
        state.user = payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        localStorage.removeItem(TOKEN_KEY);
        state.status = 'idle';
        state.user = null;
        state.token = null;
      });
  },
});

export const { loggedOut, clearAuthError } = slice.actions;

export const logout = () => (dispatch) => {
  localStorage.removeItem(TOKEN_KEY);
  dispatch(loggedOut());
};

export default slice.reducer;
