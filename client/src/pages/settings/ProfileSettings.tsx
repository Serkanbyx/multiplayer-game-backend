import { useState, useEffect, useRef, useCallback, type ChangeEvent, type FocusEvent } from 'react';
import toast from 'react-hot-toast';
import { Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input, Button, Avatar, Spinner, Textarea } from '../../components/ui';
import * as authService from '../../api/authService';
import * as userService from '../../api/userService';

const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 30;
const BIO_MAX = 200;
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

const ProfileSettings = () => {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialValuesRef = useRef({ displayName: '', bio: '' });

  const hydrate = useCallback(async () => {
    try {
      const me = await authService.getMe();
      setDisplayName(me.displayName);
      setBio(me.bio ?? '');
      setAvatarUrl(me.avatarUrl ?? '');
      initialValuesRef.current = { displayName: me.displayName, bio: me.bio ?? '' };
      setLoaded(true);
    } catch {
      toast.error('Failed to load profile');
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const validate = (field: 'displayName' | 'bio', value: string): string | undefined => {
    if (field === 'displayName') {
      if (value.length < DISPLAY_NAME_MIN || value.length > DISPLAY_NAME_MAX) {
        return `Display name must be ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters`;
      }
    }
    if (field === 'bio') {
      if (value.length > BIO_MAX) {
        return `Bio must be at most ${BIO_MAX} characters`;
      }
    }
    return undefined;
  };

  const saveField = async (field: 'displayName' | 'bio', value: string) => {
    const error = validate(field, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return;
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (value === initialValuesRef.current[field]) return;

    setSaving(true);
    try {
      const updated = await authService.updateProfile({ [field]: value });
      initialValuesRef.current[field] = value;
      if (field === 'displayName') {
        updateUser({ displayName: updated.displayName });
      }
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = (field: 'displayName' | 'bio') => (e: FocusEvent<HTMLInputElement> | FocusEvent<HTMLTextAreaElement>) => {
    saveField(field, e.target.value.trim());
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const updated = await userService.uploadAvatar(file);
      setAvatarUrl(updated.avatarUrl);
      updateUser({ avatarUrl: updated.avatarUrl });
      toast.success('Avatar uploaded');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setUploading(true);
    try {
      await userService.removeAvatar();
      setAvatarUrl('');
      updateUser({ avatarUrl: '' });
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  if (!loaded) {
    return <Spinner center />;
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Profile</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage your public profile information.
        </p>
      </div>

      {/* Avatar Section */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-fg">Avatar</label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatarUrl || null} name={displayName || 'U'} size="xl" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Camera className="h-4 w-4" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Upload
            </Button>
            {avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={handleAvatarRemove}
                disabled={uploading}
              >
                Remove
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={handleAvatarUpload}
            className="hidden"
            aria-label="Upload avatar"
          />
        </div>
      </section>

      {/* Display Name */}
      <section className="space-y-1">
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={handleBlur('displayName')}
          error={errors.displayName}
          maxLength={DISPLAY_NAME_MAX}
          disabled={saving}
          hint={`${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters`}
        />
      </section>

      {/* Bio */}
      <section className="space-y-1">
        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          onBlur={handleBlur('bio')}
          error={errors.bio}
          maxLength={BIO_MAX}
          showCounter
          disabled={saving}
          placeholder="Tell others a bit about yourself..."
        />
      </section>

      {saving && (
        <p className="text-xs text-fg-muted flex items-center gap-1">
          <Spinner size="sm" /> Saving...
        </p>
      )}
    </div>
  );
};

export default ProfileSettings;
