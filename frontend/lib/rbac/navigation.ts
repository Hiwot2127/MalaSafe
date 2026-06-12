/**
 * Navigation Configuration with RBAC
 * 
 * Defines sidebar navigation items for admin and operational dashboards
 * with role-based visibility.
 */

import { UserRole } from '@/types/auth';
import { Permission, hasPermission } from './permissions';
import {
  LayoutDashboard,
  Users,
  FileUp,
  Shield,
  Activity,
  BarChart3,
  Map,
  TrendingUp,
  Bell,
  FileText,
  Settings,
  AlertTriangle,
  Database,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  requiredPermissions?: Permission[];
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Admin Dashboard Navigation
 * Only visible to ADMIN role
 */
export const ADMIN_NAVIGATION: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
        description: 'System overview and metrics',
      },
    ],
  },
  {
    title: 'User Management',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: Users,
        description: 'Manage user accounts',
        requiredPermissions: [Permission.VIEW_USERS],
      },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      {
        label: 'Upload Monitoring',
        href: '/admin/upload-monitoring',
        icon: FileUp,
        description: 'View upload metadata',
        requiredPermissions: [Permission.VIEW_UPLOAD_METADATA],
      },
      {
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: Shield,
        description: 'Security and audit logs',
        requiredPermissions: [Permission.VIEW_AUDIT_LOGS],
      },
      {
        label: 'System Health',
        href: '/admin/system-health',
        icon: Activity,
        description: 'System status and health',
        requiredPermissions: [Permission.VIEW_SYSTEM_HEALTH],
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        label: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        description: 'System settings',
        requiredPermissions: [Permission.MANAGE_SYSTEM_SETTINGS],
      },
    ],
  },
];

/**
 * Operational Dashboard Navigation
 * Shared by MOH_OFFICER, EPHI_OFFICER, REGIONAL_OFFICER
 * Items are filtered based on role permissions
 */
export const DASHBOARD_NAVIGATION: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Main dashboard',
        requiredPermissions: [Permission.VIEW_ANALYTICS],
      },
    ],
  },
  {
    title: 'Data Upload',
    items: [
      {
        label: 'Upload Data',
        href: '/dashboard/upload',
        icon: FileUp,
        description: 'Upload malaria and climate data',
        requiredPermissions: [Permission.UPLOAD_MONTHLY_MALARIA, Permission.UPLOAD_CLIMATE],
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: BarChart3,
        description: 'Data analytics and trends',
        requiredPermissions: [Permission.VIEW_ANALYTICS],
      },
      {
        label: 'Maps',
        href: '/dashboard/maps',
        icon: Map,
        description: 'Geographic risk maps',
        requiredPermissions: [Permission.VIEW_MAPS],
      },
      {
        label: 'Predictions',
        href: '/dashboard/predictions',
        icon: TrendingUp,
        description: 'Risk predictions',
        requiredPermissions: [Permission.VIEW_PREDICTIONS],
      },
      {
        label: 'Alerts',
        href: '/dashboard/alerts',
        icon: Bell,
        description: 'Active alerts',
        requiredPermissions: [Permission.VIEW_ALERTS],
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        label: 'Reports',
        href: '/dashboard/reports',
        icon: FileText,
        description: 'Generate reports',
        requiredPermissions: [Permission.VIEW_REPORTS],
      },
      {
        label: 'Monthly Close',
        href: '/dashboard/monthly-close',
        icon: AlertTriangle,
        description: 'Monthly close operations',
        requiredPermissions: [Permission.VIEW_MONTHLY_CLOSE],
      },
    ],
  },
];

/**
 * Filter navigation items based on user role
 */
export function filterNavigation(
  navigation: NavSection[],
  role: UserRole
): NavSection[] {
  return navigation
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // If no permissions required, show to everyone
        if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
          return true;
        }
        // Check if user has at least one of the required permissions
        return item.requiredPermissions.some(perm => hasPermission(role, perm));
      }),
    }))
    .filter(section => section.items.length > 0); // Remove empty sections
}

/**
 * Get navigation for a specific role
 */
export function getNavigationForRole(role: UserRole): NavSection[] {
  if (role === UserRole.ADMIN) {
    return filterNavigation(ADMIN_NAVIGATION, role);
  } else {
    return filterNavigation(DASHBOARD_NAVIGATION, role);
  }
}

/**
 * Check if a user can access a specific path
 */
export function canAccessPath(role: UserRole, path: string): boolean {
  const navigation = getNavigationForRole(role);
  
  for (const section of navigation) {
    for (const item of section.items) {
      if (path.startsWith(item.href)) {
        return true;
      }
    }
  }
  
  return false;
}
