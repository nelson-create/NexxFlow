import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/api';
import { Alert, Button, Field } from '../components/ui';
import { AuthLayout } from './AuthLayout';

const validate = (name: string, email: string, password: string) => {
  const errors: Record<string, string> = {};
  if (name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 6) errors.password = 'Use at least 6 characters.';
  return errors;
};

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const errors = touched ? validate(name, email, password) : {};

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError('');
    if (Object.keys(validate(name, email, password)).length) return;

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/events', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to create your account.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 6 characters."
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
        <p className="text-center text-xs text-zinc-500">
          New accounts join as team members. An admin will add you to the events you&apos;re shooting.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
