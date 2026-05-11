import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import type { ApiError } from '@mpg/shared/types/api';

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

const USERNAME_HINT = '3–20 characters, lowercase letters, numbers, and underscores only';
const PASSWORD_HINT = 'At least 6 characters';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>({
    username: '',
    email: '',
    password: '',
    displayName: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setPending(true);

    try {
      await register(form);
      navigate('/');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const apiErr = err.response.data as ApiError;

        if (apiErr.errors?.length) {
          const mapped: Record<string, string> = {};
          apiErr.errors.forEach((e) => (mapped[e.field] = e.message));
          setFieldErrors(mapped);
        } else {
          toast.error(apiErr.message || 'Registration failed');
        }
      } else {
        toast.error('Registration failed');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="text-2xl font-bold text-fg text-center">Create Account</h1>
        <p className="mt-1 text-sm text-fg-muted text-center">
          Join the game and track your stats
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Username"
            type="text"
            placeholder="cool_player"
            autoComplete="username"
            required
            pattern="^[a-z0-9_]{3,20}$"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            error={fieldErrors.username}
            hint={USERNAME_HINT}
          />

          <Input
            label="Display Name"
            type="text"
            placeholder="Cool Player"
            autoComplete="off"
            required
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            error={fieldErrors.displayName}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            error={fieldErrors.password}
            hint={PASSWORD_HINT}
          />

          <Button type="submit" isLoading={pending} disabled={pending} className="mt-2 w-full">
            Create Account
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-fg-muted">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <p>
            or{' '}
            <Link to="/guest" className="text-primary hover:underline font-medium">
              Play as Guest
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
