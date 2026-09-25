import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { fetchMe } from './features/auth/authSlice.js';
import Dashboard from './pages/Dashboard.jsx';
import InterviewRoom from './pages/InterviewRoom.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Questions from './pages/Questions.jsx';
import Register from './pages/Register.jsx';
import ScheduleInterview from './pages/ScheduleInterview.jsx';

export default function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((s) => s.auth);

  // A stored token without a user means the page was reloaded: restore the session.
  useEffect(() => {
    if (token && !user) dispatch(fetchMe());
  }, [token, user, dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
        <Route path="/interviews/:id/room" element={<InterviewRoom />} />
      </Route>

      <Route element={<ProtectedRoute roles={['interviewer']} />}>
        <Route element={<Layout />}>
          <Route path="/interviews/new" element={<ScheduleInterview />} />
          <Route path="/questions" element={<Questions />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
