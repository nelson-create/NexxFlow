import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icon';
import { Avatar, Badge, Logo } from './ui';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-zinc-100"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden text-sm font-medium text-zinc-800 sm:block">{user.name}</span>
        <Icon name="chevronDown" className="h-4 w-4 text-zinc-400" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 animate-slide-in overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lift">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
            <Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'} className="mt-2">
              {user.role === 'ADMIN' ? 'Admin' : 'Team member'}
            </Badge>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Icon name="logout" className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export const AppShell = () => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo to="/events" />
          <nav className="hidden sm:block">
            <Link to="/events" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
              Events
            </Link>
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <Outlet />
    </main>
  </div>
);
