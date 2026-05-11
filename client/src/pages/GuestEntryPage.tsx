import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import type { ApiError } from '@mpg/shared/types/api';

interface GuestForm {
  displayName: string;
}

const GuestEntryPage = () => {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();

  const [form, setForm] = useState<GuestForm>({ displayName: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setPending(true);

    try {
      await loginAsGuest(form.displayName);
      navigate('/');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const apiErr = err.response.data as ApiError;

        if (apiErr.errors?.length) {
          const mapped: Record<string, string> = {};
          apiErr.errors.forEach((e) => (mapped[e.field] = e.message));
          setFieldErrors(mapped);
        } else {
          toast.error(apiErr.message || 'Could not join as guest');
        }
      } else {
        toast.error('Could not join as guest');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="text-2xl font-bold text-fg text-center">Play as Guest</h1>
        <p className="mt-1 text-sm text-fg-muted text-center">
          Jump straight into a game — no account needed
        </p>

        <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-fg">
          <p className="font-medium">Heads up!</p>
          <p className="mt-1 text-fg-muted">
            Guest progress is not saved. Stats and leaderboard require an account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Display Name"
            type="text"
            placeholder="Enter a nickname"
            autoComplete="off"
            required
            minLength={2}
            maxLength={20}
            value={form.displayName}
            onChange={(e) => setForm({ displayName: e.target.value })}
            error={fieldErrors.displayName}
            hint="2–20 characters"
          />

          <Button type="submit" isLoading={pending} disabled={pending} size="lg" className="mt-2 w-full">
            Play as Guest
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-fg-muted">
          <p>
            Want to save your progress?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </p>
          <p>
            Already have one?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GuestEntryPage;
