import { UserProfile } from '../types';

/**
 * Checks if the user has Admin or Sub-Admin privileges.
 * - Admin & Sub-Admin: Can create/enter new records, edit existing records, and delete records.
 * - Standard User: Can ONLY view data and download/export data (Excel, CSV, Reports).
 */
export const canUserModifyData = (user: UserProfile | null): boolean => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().trim();
  const username = (user.username || '').toLowerCase().trim();

  // Admin or Sub-Admin roles or primary developer username fallbacks
  if (
    role === 'ADMINISTRATOR' ||
    role === 'ADMIN' ||
    role === 'SUB_ADMIN' ||
    role === 'SUB ADMIN' ||
    role === 'SUB-ADMIN' ||
    username === 'admin@gms.com' ||
    username === 'johurul'
  ) {
    return true;
  }

  return false;
};

/**
 * Checks if the user is a Full System Administrator.
 * Only Full System Admins can manage users in the Admin Panel.
 */
export const isFullAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().trim();
  const username = (user.username || '').toLowerCase().trim();

  return (
    role === 'ADMINISTRATOR' ||
    role === 'ADMIN' ||
    username === 'admin@gms.com' ||
    username === 'johurul'
  );
};

/**
 * Returns user-friendly role label with permission description.
 */
export const getRolePermissionLabel = (user: UserProfile | null) => {
  if (!user) return { title: 'Guest', description: 'Read Only', badgeColor: 'bg-slate-500' };

  if (isFullAdmin(user)) {
    return {
      title: 'System Administrator',
      code: 'ADMINISTRATOR',
      description: 'Full Admin Access (Entry, Edit, Delete & User Management)',
      canEdit: true,
      badgeColor: 'bg-indigo-600 text-white'
    };
  }

  if (canUserModifyData(user)) {
    return {
      title: 'Sub-Admin',
      code: 'SUB_ADMIN',
      description: 'Sub-Admin Access (Data Entry, Edit & Delete Granted)',
      canEdit: true,
      badgeColor: 'bg-violet-600 text-white'
    };
  }

  return {
    title: 'Standard User',
    code: 'USER',
    description: 'Read-Only Access (View Data & Download/Export Only)',
    canEdit: false,
    badgeColor: 'bg-amber-500 text-slate-950'
  };
};
