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

export function AdminOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function AccountsOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate allowedRoles={['admin', 'accounts']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function ManagerOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate allowedRoles={['admin', 'accounts', 'manager']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}


