/**
 * Operational Dashboard Layout
 * 
 * Layout for operational users (MOH, EPHI, Regional Officers).
 * Includes RBAC-based route protection and navigation.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { canAccessDashboard } from '@/lib/rbac';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

export default function DashboardLayout({
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
        router.push('/login?next=/dashboard');
      } else if (!canAccessDashboard(user.role)) {
        // Not authorized for dashboard - redirect based on role
        if (user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/login');
        }
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
  if (!user || !canAccessDashboard(user.role)) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-8 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
