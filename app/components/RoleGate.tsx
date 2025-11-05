'use client';



import { usePermissions, UserRole } from '@/lib/usePermissions';



interface RoleGateProps {

  children: React.ReactNode;

  allowedRoles: UserRole[];

  fallback?: React.ReactNode;

}



export function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {

  const { role, loading } = usePermissions();



  if (loading) {

    return null;

  }



  if (!role || !allowedRoles.includes(role)) {

    return fallback || null;

  }



  return <>{children}</>;

}



// Convenience components

export function AdminOnly({ children }: { children: React.ReactNode }) {

  return <RoleGate allowedRoles={['admin']}>{children}</RoleGate>;

}



export function AccountsOnly({ children }: { children: React.ReactNode }) {

  return <RoleGate allowedRoles={['admin', 'accounts']}>{children}</RoleGate>;

}



export function ManagerOnly({ children }: { children: React.ReactNode }) {

  return <RoleGate allowedRoles={['admin', 'accounts', 'manager']}>{children}</RoleGate>;

}

