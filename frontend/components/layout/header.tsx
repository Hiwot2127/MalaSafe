'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Welcome back, {user?.full_name || 'User'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {user?.role?.replace('_', ' ').toUpperCase() || 'User'}
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
          <User className="w-4 h-4" />
          <span>{user?.email}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
}
