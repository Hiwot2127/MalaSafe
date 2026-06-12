/**
 * User Management Page
 * 
 * Admin page for managing user accounts.
 */

'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2, Key, UserCheck, UserX, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { UserRole } from '@/types/auth';
import { EditorialCard } from '@/components/editorial';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateUserModal } from '@/components/admin/create-user-modal';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  district_id?: string;
  is_active: boolean;
  created_at: string;
}

type ConfirmAction = {
  type: 'delete' | 'reset' | 'toggle';
  userId: string;
  userName: string;
  userEmail: string;
  currentStatus?: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = roleFilter !== 'all' ? { role: roleFilter } : {};
      console.log('Fetching users with filter:', roleFilter, 'params:', params);
      const response = await apiClient.get('/admin/users', { params });
      console.log('Received users:', response.data.length, 'users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case UserRole.MOH_OFFICER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case UserRole.EPHI_OFFICER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case UserRole.REGIONAL_OFFICER:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatRole = (role: UserRole) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleToggleActive = async (userId: string, userName: string, userEmail: string, currentStatus: boolean) => {
    setConfirmAction({
      type: 'toggle',
      userId,
      userName,
      userEmail,
      currentStatus
    });
  };

  const handleResetPassword = async (userId: string, userName: string, userEmail: string) => {
    setConfirmAction({
      type: 'reset',
      userId,
      userName,
      userEmail
    });
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    setConfirmAction({
      type: 'delete',
      userId,
      userName,
      userEmail
    });
  };

  const executeAction = async () => {
    if (!confirmAction || actionLoading) return;
    
    try {
      setActionLoading(confirmAction.userId);
      
      if (confirmAction.type === 'toggle') {
        await apiClient.patch(`/admin/users/${confirmAction.userId}`, {
          is_active: !confirmAction.currentStatus
        });
        setSuccessMessage(`${confirmAction.userName} has been ${confirmAction.currentStatus ? 'deactivated' : 'activated'}.`);
      } else if (confirmAction.type === 'reset') {
        await apiClient.post(`/admin/users/${confirmAction.userId}/reset-password`, {
          new_password: Math.random().toString(36).slice(-12) + 'A1!',
          require_change_on_login: true
        });
        setSuccessMessage(`Password reset for ${confirmAction.userName}. They will be required to change it on next login.`);
      } else if (confirmAction.type === 'delete') {
        await apiClient.delete(`/admin/users/${confirmAction.userId}`);
        setSuccessMessage(`${confirmAction.userName} has been deleted.`);
      }
      
      await fetchUsers();
      setConfirmAction(null);
    } catch (error) {
      console.error(`Failed to ${confirmAction.type} user:`, error);
      setError(`Failed to ${confirmAction.type} user. Please try again.`);
      setConfirmAction(null);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in mx-auto max-w-6xl w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Create and manage user accounts
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)} aria-label="Create new user account">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.MOH_OFFICER}>MOH Officer</option>
            <option value={UserRole.EPHI_OFFICER}>EPHI Officer</option>
            <option value={UserRole.REGIONAL_OFFICER}>Regional Officer</option>
          </select>
        </div>
      </EditorialCard>

      {/* Users Table */}
      <EditorialCard className="border-border/40 bg-background/60 backdrop-blur-md">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-4">
              <Users className="h-8 w-8 text-red-600" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold text-red-900 dark:text-red-100">{error}</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 mb-4">Please try again</p>
            <button 
              onClick={fetchUsers}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'Create your first user to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-muted/50 transition-colors focus-within:bg-muted/50"
                    tabIndex={0}
                    role="row"
                    aria-label={`User ${user.full_name}, ${user.email}, ${user.is_active ? 'Active' : 'Inactive'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span className="text-sm font-semibold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                          <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                          <div className="h-2 w-2 rounded-full bg-red-600 dark:bg-red-400" aria-hidden="true" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            aria-label={`Actions for ${user.full_name}`}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                              <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.full_name, user.email)}>
                            <Key className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(user.id, user.full_name, user.email, user.is_active)}>
                            {user.is_active ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" strokeWidth={1.5} />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" strokeWidth={1.5} />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteUser(user.id, user.full_name, user.email)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EditorialCard>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Total Users</p>
          <p className="text-3xl font-display font-bold relative z-10 mt-1">{users.length}</p>
        </EditorialCard>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Active Users</p>
          <p className="text-3xl font-display font-bold text-green-600 relative z-10 mt-1">{users.filter(u => u.is_active).length}</p>
        </EditorialCard>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Admins</p>
          <p className="text-3xl font-display font-bold relative z-10 mt-1">{users.filter(u => u.role === UserRole.ADMIN).length}</p>
        </EditorialCard>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Officers</p>
          <p className="text-3xl font-display font-bold relative z-10 mt-1">
            {users.filter(u => u.role !== UserRole.ADMIN && u.role !== UserRole.PUBLIC_USER).length}
          </p>
        </EditorialCard>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  confirmAction.type === 'delete' 
                    ? 'bg-red-500/10' 
                    : confirmAction.type === 'reset'
                    ? 'bg-yellow-500/10'
                    : 'bg-blue-500/10'
                }`}>
                  {confirmAction.type === 'delete' ? (
                    <Trash2 className="h-5 w-5 text-red-600" strokeWidth={1.5} />
                  ) : confirmAction.type === 'reset' ? (
                    <Key className="h-5 w-5 text-yellow-600" strokeWidth={1.5} />
                  ) : confirmAction.currentStatus ? (
                    <UserX className="h-5 w-5 text-orange-600" strokeWidth={1.5} />
                  ) : (
                    <UserCheck className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {confirmAction.type === 'delete' 
                      ? 'Delete User' 
                      : confirmAction.type === 'reset'
                      ? 'Reset Password'
                      : confirmAction.currentStatus
                      ? 'Deactivate User'
                      : 'Activate User'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {confirmAction.type === 'delete' ? (
                      <>
                        Are you sure you want to delete <strong className="text-foreground">{confirmAction.userName}</strong> ({confirmAction.userEmail})?
                        <span className="block mt-2 text-red-600 dark:text-red-400 font-medium">This action cannot be undone.</span>
                      </>
                    ) : confirmAction.type === 'reset' ? (
                      <>
                        Reset password for <strong className="text-foreground">{confirmAction.userName}</strong> ({confirmAction.userEmail})?
                        <span className="block mt-2">A temporary password will be generated and the user will be required to change it on next login.</span>
                      </>
                    ) : confirmAction.currentStatus ? (
                      <>
                        Deactivate <strong className="text-foreground">{confirmAction.userName}</strong> ({confirmAction.userEmail})?
                        <span className="block mt-2">This user will no longer be able to log in.</span>
                      </>
                    ) : (
                      <>
                        Activate <strong className="text-foreground">{confirmAction.userName}</strong> ({confirmAction.userEmail})?
                        <span className="block mt-2">This user will be able to log in again.</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={!!actionLoading}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    confirmAction.type === 'delete'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : confirmAction.type === 'reset'
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {actionLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    confirmAction.type === 'delete' ? 'Delete User' : confirmAction.type === 'reset' ? 'Reset Password' : confirmAction.currentStatus ? 'Deactivate' : 'Activate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-foreground">Success</h3>
                  <p className="text-sm text-muted-foreground mt-1">{successMessage}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-sm"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
