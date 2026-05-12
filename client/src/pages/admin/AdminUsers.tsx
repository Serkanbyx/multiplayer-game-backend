import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { RoleBadge } from '../../components/ui/RoleBadge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { formatDateTime } from '../../utils/formatDate';
import {
  getUsers,
  updateUserRole,
  deleteUser,
  type AdminUsersResponse,
  type PaginationMeta,
} from '../../api/adminService';
import type { IUserBase } from '@mpg/shared/types/user';

const DEBOUNCE_DELAY = 300;
const PAGE_SIZE = 20;

const AdminUsers = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<IUserBase[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  /* Debounced search */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, DEBOUNCE_DELAY);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  /* Role change modal */
  const [roleModalUser, setRoleModalUser] = useState<IUserBase | null>(null);
  const [roleModalNewRole, setRoleModalNewRole] = useState<'player' | 'admin'>('player');
  const [roleModalLoading, setRoleModalLoading] = useState(false);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  /* Delete modal */
  const [deleteModalUser, setDeleteModalUser] = useState<IUserBase | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;

      const data: AdminUsersResponse = await getUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
      setError(null);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const isSelf = (userId: string) => currentUser?._id === userId;

  /* ---- Role change ---- */
  const openRoleModal = (user: IUserBase) => {
    setRoleModalUser(user);
    setRoleModalNewRole(user.role === 'admin' ? 'player' : 'admin');
    setRoleModalError(null);
  };

  const handleRoleChange = async () => {
    if (!roleModalUser) return;
    setRoleModalLoading(true);
    setRoleModalError(null);
    try {
      const updated = await updateUserRole(roleModalUser.id, roleModalNewRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setRoleModalUser(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to update role.')
          : 'Failed to update role.';
      setRoleModalError(msg);
    } finally {
      setRoleModalLoading(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async () => {
    if (!deleteModalUser) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteModalUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModalUser.id));
      setDeleteModalUser(null);
    } catch {
      /* Error handled silently — modal stays open */
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Users</h1>
        <p className="mt-1 text-sm text-fg-muted">Manage all platform users.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by username, email, or display name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftSlot={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="player">Player</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner center size="lg" />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-danger">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <EmptyState heading="No users found" description="Try adjusting your search or filter." />
      ) : (
        <Card className="overflow-hidden p-0!">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-3 font-medium text-fg-muted">User</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Email</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Role</th>
                  <th className="px-4 py-3 font-medium text-fg-muted text-right">Games Played</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Last Login</th>
                  <th className="px-4 py-3 font-medium text-fg-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/50 last:border-0 hover:bg-surface/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{u.displayName || u.username}</p>
                          <p className="truncate text-xs text-fg-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg-muted truncate max-w-[180px]">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-fg text-right tabular-nums">
                      {u.stats?.gamesPlayed ?? 0}
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-sm">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSelf(u.id)}
                          onClick={() => openRoleModal(u)}
                        >
                          Change Role
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isSelf(u.id)}
                          onClick={() => setDeleteModalUser(u)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-fg-muted">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-fg-muted tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Change Role Modal */}
      <Modal
        isOpen={!!roleModalUser}
        onClose={() => setRoleModalUser(null)}
        title="Change User Role"
      >
        {roleModalUser && (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              Change <span className="font-medium text-fg">{roleModalUser.displayName || roleModalUser.username}</span>'s
              role from <RoleBadge role={roleModalUser.role} /> to{' '}
              <RoleBadge role={roleModalNewRole} />.
            </p>

            {roleModalError && (
              <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{roleModalError}</p>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setRoleModalUser(null)} disabled={roleModalLoading}>
                Cancel
              </Button>
              <Button onClick={handleRoleChange} isLoading={roleModalLoading}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteModalUser}
        onClose={() => setDeleteModalUser(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteModalUser?.displayName || deleteModalUser?.username}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default AdminUsers;
