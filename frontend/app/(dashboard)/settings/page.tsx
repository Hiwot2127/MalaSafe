'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Profile */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          User Profile
        </h2>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.full_name || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.email || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.role?.replace('_', ' ').toUpperCase() || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.created_at ? formatDateTime(user.created_at) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Account Information
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>User ID: {user?.id || 'N/A'}</p>
          {user?.district_id && <p>District ID: {user.district_id}</p>}
        </div>
      </div>

      {/* Preferences */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Preferences
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Theme and notification preferences will be available in a future update.
        </p>
      </div>
    </div>
  );
}
