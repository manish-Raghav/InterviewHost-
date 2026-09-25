import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Spinner from './Spinner.jsx';

// Redirects to /login when signed out, and to / when the user's role isn't allowed.
export default function ProtectedRoute({ roles }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user) return <Spinner full />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
