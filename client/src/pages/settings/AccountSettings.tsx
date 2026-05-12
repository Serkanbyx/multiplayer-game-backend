import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input, Button, Modal } from '../../components/ui';
import * as authService from '../../api/authService';

const DELETE_CONFIRMATION_PHRASE = 'DELETE my account';

const AccountSettings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  /* ---- Change Password ---- */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const validatePassword = (): boolean => {
    const errs: Record<string, string> = {};

    if (!currentPassword) errs.currentPassword = 'Current password is required';
    if (newPassword.length < 6) errs.newPassword = 'New password must be at least 6 characters';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setPasswordLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  /* ---- Delete Account ---- */
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const validateDelete = (): boolean => {
    const errs: Record<string, string> = {};

    if (!deletePassword) errs.deletePassword = 'Password is required';
    if (deletePhrase !== DELETE_CONFIRMATION_PHRASE) {
      errs.deletePhrase = `Please type "${DELETE_CONFIRMATION_PHRASE}" to confirm`;
    }

    setDeleteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDeleteAccount = async () => {
    if (!validateDelete()) return;

    setDeleteLoading(true);
    try {
      await authService.deleteAccount({ password: deletePassword });
      toast.success('Account deleted');
      logout();
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete account';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletePassword('');
    setDeletePhrase('');
    setDeleteErrors({});
  };

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Account</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage your account security and settings.
        </p>
      </div>

      {/* Change Password */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-fg">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={passwordErrors.currentPassword}
          />
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={passwordErrors.newPassword}
            hint="Minimum 6 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordErrors.confirmPassword}
          />
          <Button type="submit" isLoading={passwordLoading}>
            Change Password
          </Button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-danger" />
          <h2 className="text-lg font-semibold text-danger">Danger Zone</h2>
        </div>
        <p className="text-sm text-fg-muted">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
          Delete Account
        </Button>
      </section>

      {/* Delete Account Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={resetDeleteModal}
        title="Delete Account"
      >
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            This will permanently delete your account, game history, and all associated data.
            This action <strong className="text-danger">cannot be undone</strong>.
          </p>

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            error={deleteErrors.deletePassword}
            placeholder="Enter your password"
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">
              Type <span className="font-mono text-danger">"{DELETE_CONFIRMATION_PHRASE}"</span> to confirm
            </label>
            <Input
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              error={deleteErrors.deletePhrase}
              placeholder={DELETE_CONFIRMATION_PHRASE}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={resetDeleteModal} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              isLoading={deleteLoading}
              disabled={deletePhrase !== DELETE_CONFIRMATION_PHRASE}
            >
              Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountSettings;
