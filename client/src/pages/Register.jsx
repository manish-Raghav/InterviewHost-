import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AuthShell from '../components/AuthShell.jsx';
import { clearAuthError, registerUser } from '../features/auth/authSlice.js';

const ROLE_OPTIONS = [
  { id: 'candidate', label: 'Candidate', hint: 'I am being interviewed' },
  { id: 'interviewer', label: 'Interviewer', hint: 'I run interviews' },
];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, status, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (token) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) navigate('/', { replace: true });
  };

  return (
    <AuthShell title="Create your account" subtitle="It takes less than a minute.">
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset>
          <legend className="label">I am a</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((r) => (
              <label
                key={r.id}
                className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                  form.role === r.id ? 'border-signal bg-signal-soft' : 'border-line bg-white hover:bg-paper'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.id}
                  checked={form.role === r.id}
                  onChange={set('role')}
                  className="sr-only"
                />
                <span className="block font-medium">{r.label}</span>
                <span className="block text-xs text-muted">{r.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" className="input" value={form.name} onChange={set('name')} required autoComplete="name" />
        </div>
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
            minLength={6}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-muted">At least 6 characters.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-rose-soft px-3 py-2 text-sm text-rose">
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-signal-dark underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
