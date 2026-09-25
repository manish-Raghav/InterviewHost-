import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice.js';
import Logo from './Logo.jsx';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`;

export default function Layout() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const signOut = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-full md:flex">
      <aside className="flex flex-wrap items-center gap-3 bg-ink px-4 py-3 md:sticky md:top-0 md:h-screen md:w-60 md:flex-col md:items-stretch md:gap-6 md:px-4 md:py-6">
        <div className="md:px-3">
          <Logo light />
        </div>

        <nav className="flex flex-1 gap-1 md:flex-col" aria-label="Main">
          <NavLink to="/" end className={linkClass}>
            Interviews
          </NavLink>
          {user.role === 'interviewer' && (
            <>
              <NavLink to="/interviews/new" className={linkClass}>
                Schedule interview
              </NavLink>
              <NavLink to="/questions" className={linkClass}>
                Question bank
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-2 md:border-t md:border-white/10 md:pt-4">
          <div className="min-w-0 md:px-3">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs capitalize text-white/60">{user.role}</p>
          </div>
          <button onClick={signOut} className="btn text-white/80 hover:bg-white/10 md:justify-start">
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
