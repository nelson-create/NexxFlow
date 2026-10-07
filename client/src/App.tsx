import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { FullPageSpinner, Logo, buttonClass } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import PublicGalleryGate from './pages/PublicGalleryGate';
import PublicGallery from './pages/PublicGallery';

const RequireAuth = () => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
};

const GuestOnly = () => {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/events" replace />;
  return <Outlet />;
};

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
    <Logo />
    <div>
      <p className="font-display text-6xl font-medium text-zinc-300">404</p>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900">This page doesn&apos;t exist</h1>
      <p className="mt-1 text-sm text-zinc-500">Check the link, or head back to your events.</p>
    </div>
    <Link to="/" className={buttonClass()}>
      Go home
    </Link>
  </div>
);

const App = () => (
  <Routes>
    <Route element={<GuestOnly />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>

    <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
      </Route>
    </Route>

    <Route path="/gallery/access" element={<PublicGalleryGate />} />
    <Route path="/gallery/:slug" element={<PublicGallery />} />

    {/* Old dashboard URLs */}
    <Route path="/admin" element={<Navigate to="/events" replace />} />
    <Route path="/team" element={<Navigate to="/events" replace />} />
    <Route path="/" element={<Navigate to="/events" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
