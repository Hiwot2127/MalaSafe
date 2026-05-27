/**
 * Route Protection Utilities
 * 
 * Provides utilities for protecting routes based on authentication and roles.
 */

import { UserRole } from '@/types/auth';
import { canAccessAdminPanel, canAccessDashboard, getDefaultRedirect } from './permissions';

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  // Public routes - accessible to everyone
  const publicRoutes = ['/login', '/public'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return true;
  }
  
  // Not authenticated
  if (!role) {
    return false;
  }
  
  // Admin routes - only ADMIN
  if (pathname.startsWith('/admin')) {
    return canAccessAdminPanel(role);
  }
  
  // Dashboard routes - operational users
  if (pathname.startsWith('/dashboard')) {
    return canAccessDashboard(role);
  }
  
  // Default: deny access
  return false;
}

/**
 * Get redirect path for unauthorized access
 */
export function getUnauthorizedRedirect(
  role: UserRole | null,
  attemptedPath: string
): string {
  // Not authenticated - redirect to login
  if (!role) {
    return `/login?next=${encodeURIComponent(attemptedPath)}`;
  }
  
  // Authenticated but wrong role - redirect to their default dashboard
  return getDefaultRedirect(role);
}

/**
 * Route protection configuration
 */
export interface RouteProtection {
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * Route protection rules
 */
export const ROUTE_PROTECTION: Record<string, RouteProtection> = {
  '/login': {
    requiresAuth: false,
  },
  '/public': {
    requiresAuth: false,
  },
  '/admin': {
    requiresAuth: true,
    allowedRoles: [UserRole.ADMIN],
    redirectTo: '/dashboard',
  },
  '/dashboard': {
    requiresAuth: true,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.MOH_OFFICER,
      UserRole.EPHI_OFFICER,
      UserRole.REGIONAL_OFFICER,
    ],
    redirectTo: '/login',
  },
};

/**
 * Get route protection for a path
 */
export function getRouteProtection(pathname: string): RouteProtection | null {
  // Find the most specific matching route
  const routes = Object.keys(ROUTE_PROTECTION).sort((a, b) => b.length - a.length);
  
  for (const route of routes) {
    if (pathname.startsWith(route)) {
      return ROUTE_PROTECTION[route];
    }
  }
  
  return null;
}

/**
 * Validate route access
 */
export function validateRouteAccess(
  role: UserRole | null,
  pathname: string
): { allowed: boolean; redirectTo?: string } {
  const protection = getRouteProtection(pathname);
  
  // No protection defined - allow access
  if (!protection) {
    return { allowed: true };
  }
  
  // Requires auth but not authenticated
  if (protection.requiresAuth && !role) {
    return {
      allowed: false,
      redirectTo: `/login?next=${encodeURIComponent(pathname)}`,
    };
  }
  
  // Check role restrictions
  if (protection.allowedRoles && role) {
    if (!protection.allowedRoles.includes(role)) {
      return {
        allowed: false,
        redirectTo: protection.redirectTo || getDefaultRedirect(role),
      };
    }
  }
  
  return { allowed: true };
}
