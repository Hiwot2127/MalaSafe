/**
 * Create User Modal
 * 
 * Modal for creating new user accounts with auto-generated passwords.
 */

'use client';

import { useState } from 'react';
import { X, User, Mail, Shield, MapPin, Key, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { EditorialCard } from '@/components/editorial';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreatedUser {
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MOH_OFFICER);
  const [districtId, setDistrictId] = useState('');
  
  // Created user data
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole(UserRole.MOH_OFFICER);
    setDistrictId('');
    setError('');
    setStep('form');
    setCreatedUser(null);
    setCopiedPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/admin/users', {
        full_name: fullName,
        email: email,
        role: role,
        district_id: districtId || null,
        generate_password: true,
      });

      const temporaryPassword = response.data.temporary_password;
      
      setCreatedUser({
        email: response.data.email,
        full_name: response.data.full_name,
        role: response.data.role,
        password: temporaryPassword,
      });
      
      setStep('success');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (createdUser) {
      navigator.clipboard.writeText(createdUser.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const formatRole = (role: UserRole) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4">
        <EditorialCard className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {step === 'form' ? 'Create New User' : 'User Created Successfully'}
            </h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" strokeWidth={1.5} />
                    Full Name
                  </div>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Abebe Kebede"
                  required
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                    Institutional Email
                  </div>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@moh.gov.et"
                  required
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use institutional emails: @moh.gov.et, @ephi.gov.et, etc.
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" strokeWidth={1.5} />
                    Role
                  </div>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.MOH_OFFICER}>MOH Officer</option>
                  <option value={UserRole.EPHI_OFFICER}>EPHI Officer</option>
                  <option value={UserRole.REGIONAL_OFFICER}>Regional Officer</option>
                </select>
              </div>

              {/* District (for Regional Officers) */}
              {role === UserRole.REGIONAL_OFFICER && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" strokeWidth={1.5} />
                      District ID
                    </div>
                  </label>
                  <input
                    type="text"
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    placeholder="addis_ababa_bole"
                    required={role === UserRole.REGIONAL_OFFICER}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for regional officers
                  </p>
                </div>
              )}

              {/* Password Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" strokeWidth={1.5} />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Secure Password Generation
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                      A secure temporary password will be automatically generated. 
                      The user will be required to change it on first login.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" strokeWidth={1.5} />
                    <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      User account created successfully!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      The user can now log in with the credentials below.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Details */}
              {createdUser && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Full Name
                    </label>
                    <p className="text-lg font-medium mt-1">{createdUser.full_name}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </label>
                    <p className="text-lg font-medium mt-1">{createdUser.email}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </label>
                    <p className="text-lg font-medium mt-1">{formatRole(createdUser.role)}</p>
                  </div>

                  {/* Temporary Password */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                    <label className="text-xs font-medium text-amber-900 dark:text-amber-100 uppercase tracking-wider">
                      Temporary Password
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded font-mono text-sm">
                        {createdUser.password}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyPassword}
                        className="gap-2"
                      >
                        {copiedPassword ? (
                          <>
                            <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" strokeWidth={1.5} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                      ⚠️ Save this password securely. The user must change it on first login.
                    </p>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Next Steps:
                </p>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Send the credentials to the user via secure channel</li>
                  <li>User logs in with temporary password</li>
                  <li>User is prompted to change password on first login</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    resetForm();
                    setStep('form');
                  }}
                  className="flex-1"
                >
                  Create Another User
                </Button>
              </div>
            </div>
          )}
        </EditorialCard>
      </div>
    </div>
  );
}
