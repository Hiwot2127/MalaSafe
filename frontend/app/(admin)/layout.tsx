/**
 * Admin Dashboard Layout
 * 
 * Layout for admin-only pages with sidebar navigation.
 * Only accessible to users with ADMIN role.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserRole } from '@/types/auth';
import { canAccessAdminPanel } from '@/lib/rbac';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { ToastProvider } from '@/lib/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated - redirect to login
        router.push('/login?next=/admin');
      } else if (!canAccessAdminPanel(user.role)) {
        // Not admin - redirect to their dashboard
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized
  if (!user || !canAccessAdminPanel(user.role)) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </ToastProvider>
  );
}
