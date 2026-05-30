import { UserStatus } from '@/types/auth';
import { CheckCircle2, XCircle, Lock, AlertTriangle } from 'lucide-react';

interface UserStatusBadgeProps {
  status: UserStatus;
  className?: string;
}

export function UserStatusBadge({ status, className = '' }: UserStatusBadgeProps) {
  const statusConfig = {
    active: {
      label: 'Active',
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    },
    inactive: {
      label: 'Inactive',
      icon: XCircle,
      className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
    },
    locked: {
      label: 'Locked',
      icon: Lock,
      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    },
    password_reset_required: {
      label: 'Password Reset Required',
      icon: AlertTriangle,
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {config.label}
    </span>
  );
}
