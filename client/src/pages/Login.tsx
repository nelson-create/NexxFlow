import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/api';
import { Alert, Button, Field } from '../components/ui';
import { AuthLayout } from './AuthLayout';

const demoAccounts = [
  { label: 'Admin', email: 'admin@nexxflow.com', password: 'admin123' },
  { label: 'Team member', email: 'member@nexxflow.com', password: 'member123' },
];

export const Login = () => {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from && from !== '/login' ? from : '/events', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to sign in.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New to Nexxflow?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {sessionExpired && !error && <Alert tone="info">Your session expired. Please sign in again.</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!email || !password}>
          Sign in
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Demo accounts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demoAccounts.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-sm text-zinc-500">
        Have a gallery PIN?{' '}
        <Link to="/gallery/access" className="font-semibold text-zinc-900 hover:underline">
          Open a client gallery
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
