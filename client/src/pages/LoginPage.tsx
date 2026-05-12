import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import type { ApiError } from '@mpg/shared/types/api';

interface LoginForm {
  email: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setPending(true);

    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const apiErr = err.response.data as ApiError;

        if (apiErr.errors?.length) {
          const mapped: Record<string, string> = {};
          apiErr.errors.forEach((e) => (mapped[e.field] = e.message));
          setFieldErrors(mapped);
        } else {
          toast.error(apiErr.message || 'Invalid email or password');
        }
      } else {
        toast.error('Invalid email or password');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg text-center focus:outline-none">Welcome Back</h1>
        <p className="mt-1 text-sm text-fg-muted text-center">
          Sign in to continue playing
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            error={fieldErrors.password}
          />

          <Button type="submit" isLoading={pending} disabled={pending} className="mt-2 w-full">
            Sign In
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-fg-muted">
          <p>
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create one
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

export default LoginPage;
