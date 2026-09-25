import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AuthShell from '../components/AuthShell.jsx';
import { clearAuthError, loginUser } from '../features/auth/authSlice.js';

export default function Login() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { token, status, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const redirectTo = location.state?.from?.pathname || '/';
  if (token) return <Navigate to={redirectTo} replace />;

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(form)); // on success `token` is set and the redirect above kicks in
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Pick up where you left off.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="input" value={form.email} onChange={set('email')} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={set('password')}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-rose-soft px-3 py-2 text-sm text-rose">
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-medium text-signal-dark underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
