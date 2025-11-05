'use client';



import { usePermissions } from '@/lib/usePermissions';

import { useRouter } from 'next/navigation';

import { useEffect } from 'react';



interface ProtectedRouteProps {

  children: React.ReactNode;

  requiredRoles?: ('admin' | 'accounts' | 'manager' | 'staff')[];

  fallback?: React.ReactNode;

}



export function ProtectedRoute({ 

  children, 

  requiredRoles,

  fallback 

}: ProtectedRouteProps) {

  const { role, loading } = usePermissions();

  const router = useRouter();



  useEffect(() => {

    if (!loading && !role) {

      router.push('/login');

    }

  }, [loading, role, router]);



  if (loading) {

    return (

      <div className="flex items-center justify-center min-h-screen">

        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>

      </div>

    );

  }



  if (!role) {

    return null;

  }



  if (requiredRoles && !requiredRoles.includes(role)) {

    return fallback || (

      <div className="flex items-center justify-center min-h-screen">

        <div className="text-center">

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>

          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>

        </div>

      </div>

    );

  }



  return <>{children}</>;

}

