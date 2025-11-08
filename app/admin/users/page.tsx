'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, Users, Shield, UserCog } from 'lucide-react';
import { UserRole } from '@/types';
import { Toast } from '@/app/components/Toast';
import { Loading } from '@/app/components/Loading';
import { ConfirmationDialog } from '@/app/components/ConfirmationDialog';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';
import { RoleGate } from '@/app/components/RoleGate';
import { usePermissions } from '@/lib/usePermissions';

interface User {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  username: string;
  password: string;
  role: UserRole;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: User | null;
  isLoading: boolean;
}

const VALID_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'accounts', label: 'Accounts', description: 'Financial and payment access' },
  { value: 'manager', label: 'Manager', description: 'Management and reporting access' },
  { value: 'staff', label: 'Staff', description: 'Limited access' },
];

function UserModal({ isOpen, onClose, onSubmit, initialData, isLoading }: ModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'staff',
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: initialData.username,
        password: '', // Don't populate password for edit
        role: initialData.role,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        role: 'staff',
      });
    }
    setPasswordError('');
  }, [initialData, isOpen]);

  const validatePassword = (password: string): boolean => {
    if (initialData) {
      // For edit, password is optional
      return password === '' || password.length >= 4;
    } else {
      // For create, password is required
      return password.length >= 4;
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, password: value });
    if (value && !validatePassword(value)) {
      setPasswordError('Password must be at least 4 characters');
    } else {
      setPasswordError('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    if (!validatePassword(formData.password)) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }

    // For edit, if password is empty, don't send it
    const submitData = { ...formData };
    if (initialData && !submitData.password) {
      // Remove password from update if not provided
      delete (submitData as any).password;
    }

    await onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-auto max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit User' : 'Add User'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="username"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.trim() })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="Enter username"
              disabled={!!initialData} // Disable username edit for existing users
            />
            {initialData && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Username cannot be changed
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Password {!initialData && <span className="text-red-500">*</span>}
              {initialData && (
                <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">
                  (leave blank to keep current password)
                </span>
              )}
            </label>
            <input
              type="password"
              id="password"
              required={!initialData}
              value={formData.password}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all ${
                passwordError
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={initialData ? 'Enter new password (optional)' : 'Enter password'}
            />
            {passwordError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
            >
              {VALID_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {VALID_ROLES.find((r) => r.value === formData.role)?.description}
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 disabled:opacity-50 transition-all duration-150 touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !!passwordError}
              className="flex-1 px-4 py-3 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 touch-manipulation hover:shadow-md active:scale-[0.98]"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { isAdmin, loading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { sortedData, handleSort, sortConfig } = useSortable(users);

  useEffect(() => {
    if (!permissionsLoading) {
      fetchUsers();
    }
  }, [permissionsLoading]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch users. Please try again.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeleteDialog({ isOpen: true, user });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/users/${deleteDialog.user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      showToast('User deleted successfully', 'success');
      setDeleteDialog({ isOpen: false, user: null });
      fetchUsers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete user. Please try again.';
      showToast(message, 'error');
      setDeleteDialog({ isOpen: false, user: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (formData: UserFormData) => {
    try {
      setIsSubmitting(true);
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      // For update, if password is not provided, don't include it in the payload
      const payload: any = {
        username: formData.username.trim(),
        role: formData.role,
      };

      // Only include password if it's provided (for create) or changed (for update)
      if (!editingUser || formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save user');
      }

      showToast(
        editingUser ? 'User updated successfully' : 'User created successfully',
        'success'
      );
      setIsModalOpen(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save user. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'accounts':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'staff':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6" />
              User Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage users and their roles
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {loading ? (
          <Loading message="Loading users..." />
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No users found. Add your first user to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <SortableHeader
                        label="Username"
                        sortKey="username"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Role"
                        sortKey="role"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Created"
                        sortKey="created_at"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Updated"
                        sortKey="updated_at"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                    {sortedData.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <UserCog className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(user.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                              aria-label="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                              aria-label="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 hover:shadow-md transition-shadow duration-150"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCog className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                          {user.username}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 active:scale-95"
                        aria-label="Edit user"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 active:scale-95"
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Created
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Updated
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDate(user.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingUser}
        isLoading={isSubmitting}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteDialog.user?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, user: null })}
        isLoading={isDeleting}
      />
    </RoleGate>
  );
}


