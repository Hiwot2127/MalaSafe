/**
 * Role-Based Access Control (RBAC) Permission System
 * 
 * Defines permissions for each role and provides utilities for checking access.
 * 
 * IMPORTANT: Frontend permissions are for UI visibility only.
 * Backend MUST enforce all permissions on API endpoints.
 */

import { UserRole } from '@/types/auth';

export enum Permission {
  // User Management
  CREATE_USER = 'create_user',
  EDIT_USER = 'edit_user',
  DELETE_USER = 'delete_user',
  VIEW_USERS = 'view_users',
  RESET_PASSWORD = 'reset_password',
  CHANGE_USER_ROLE = 'change_user_role',
  ACTIVATE_DEACTIVATE_USER = 'activate_deactivate_user',
  
  // Data Upload
  UPLOAD_MONTHLY_MALARIA = 'upload_monthly_malaria',
  UPLOAD_WEEKLY_MALARIA = 'upload_weekly_malaria',
  UPLOAD_CLIMATE = 'upload_climate',
  VIEW_UPLOAD_METADATA = 'view_upload_metadata',
  VIEW_UPLOAD_CONTENTS = 'view_upload_contents',
  DOWNLOAD_UPLOADS = 'download_uploads',
  DELETE_UPLOADS = 'delete_uploads',
  
  // Analytics & Viewing
  VIEW_ANALYTICS = 'view_analytics',
  VIEW_MAPS = 'view_maps',
  VIEW_PREDICTIONS = 'view_predictions',
  VIEW_ALERTS = 'view_alerts',
  VIEW_REPORTS = 'view_reports',
  
  // System Administration
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  VIEW_SECURITY_LOGS = 'view_security_logs',
  VIEW_SYSTEM_HEALTH = 'view_system_health',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  
  // Monthly Close
  INITIATE_MONTHLY_CLOSE = 'initiate_monthly_close',
  APPROVE_MONTHLY_CLOSE = 'approve_monthly_close',
  VIEW_MONTHLY_CLOSE = 'view_monthly_close',
}

/**
 * Role-Permission Mapping
 * Defines what each role can do in the system.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // User Management - FULL ACCESS
    Permission.CREATE_USER,
    Permission.EDIT_USER,
    Permission.VIEW_USERS,
    Permission.RESET_PASSWORD,
    Permission.CHANGE_USER_ROLE,
    Permission.ACTIVATE_DEACTIVATE_USER,
    
    // Upload Monitoring - METADATA ONLY (no content access)
    Permission.VIEW_UPLOAD_METADATA,
    
    // System Administration - FULL ACCESS
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_SECURITY_LOGS,
    Permission.VIEW_SYSTEM_HEALTH,
    Permission.MANAGE_SYSTEM_SETTINGS,
    
    // Analytics - READ ONLY
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_MAPS,
    Permission.VIEW_PREDICTIONS,
    Permission.VIEW_ALERTS,
    Permission.VIEW_REPORTS,
    
    // Monthly Close - VIEW ONLY
    Permission.VIEW_MONTHLY_CLOSE,
  ],
  
  [UserRole.MOH_OFFICER]: [
    // Data Upload
    Permission.UPLOAD_MONTHLY_MALARIA,
    Permission.UPLOAD_CLIMATE,
    Permission.VIEW_UPLOAD_METADATA,
    Permission.VIEW_UPLOAD_CONTENTS,
    Permission.DOWNLOAD_UPLOADS,
    
    // Analytics
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_MAPS,
    Permission.VIEW_PREDICTIONS,
    Permission.VIEW_ALERTS,
    Permission.VIEW_REPORTS,
    
    // Monthly Close
    Permission.INITIATE_MONTHLY_CLOSE,
    Permission.APPROVE_MONTHLY_CLOSE,
    Permission.VIEW_MONTHLY_CLOSE,
  ],
  
  [UserRole.EPHI_OFFICER]: [
    // Data Upload
    Permission.UPLOAD_WEEKLY_MALARIA,
    Permission.UPLOAD_CLIMATE,
    Permission.VIEW_UPLOAD_METADATA,
    Permission.VIEW_UPLOAD_CONTENTS,
    Permission.DOWNLOAD_UPLOADS,
    
    // Analytics
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_MAPS,
    Permission.VIEW_PREDICTIONS,
    Permission.VIEW_ALERTS,
    Permission.VIEW_REPORTS,
    
    // Monthly Close - VIEW ONLY
    Permission.VIEW_MONTHLY_CLOSE,
  ],
  
  [UserRole.REGIONAL_OFFICER]: [
    // Analytics - READ ONLY
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_MAPS,
    Permission.VIEW_PREDICTIONS,
    Permission.VIEW_ALERTS,
    Permission.VIEW_REPORTS,
    
    // Monthly Close - VIEW ONLY
    Permission.VIEW_MONTHLY_CLOSE,
  ],
  
  [UserRole.PUBLIC_USER]: [
    // Public mobile app only - no dashboard access
  ],
};

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getRolePermissions(role).includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePerms = getRolePermissions(role);
  return permissions.some(perm => rolePerms.includes(perm));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePerms = getRolePermissions(role);
  return permissions.every(perm => rolePerms.includes(perm));
}

/**
 * Check if role can upload any type of data
 */
export function canUploadData(role: UserRole): boolean {
  return hasAnyPermission(role, [
    Permission.UPLOAD_MONTHLY_MALARIA,
    Permission.UPLOAD_WEEKLY_MALARIA,
    Permission.UPLOAD_CLIMATE,
  ]);
}

/**
 * Check if role can access admin panel
 */
export function canAccessAdminPanel(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Check if role can access operational dashboard
 */
export function canAccessDashboard(role: UserRole): boolean {
  return [
    UserRole.ADMIN,
    UserRole.MOH_OFFICER,
    UserRole.EPHI_OFFICER,
    UserRole.REGIONAL_OFFICER,
  ].includes(role);
}

/**
 * Check if role can view actual CSV contents
 * ADMIN can only see metadata, not contents
 */
export function canViewUploadContents(role: UserRole): boolean {
  return hasPermission(role, Permission.VIEW_UPLOAD_CONTENTS);
}

/**
 * Get default redirect path after login based on role
 */
export function getDefaultRedirect(role: UserRole): string {
  if (role === UserRole.ADMIN) {
    return '/admin';
  } else if (canAccessDashboard(role)) {
    return '/dashboard';
  } else {
    // PUBLIC_USER should use mobile app
    return '/public';
  }
}
