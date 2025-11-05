import { useEffect, useState } from 'react';

export type UserRole = 'admin' | 'accounts' | 'manager' | 'staff' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        // Check localStorage first (client-side)
        if (typeof window !== 'undefined') {
          const storedRole = localStorage.getItem('user_role') as UserRole;
          const storedUsername = localStorage.getItem('user_username');
          const token = localStorage.getItem('auth_token');
          
          if (token && storedRole) {
            // Verify session with API
            const response = await fetch('/api/auth/session', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.authenticated) {
                // Always use API response for role and username (most up-to-date)
                setRole(data.role || storedRole);
                setUsername(data.username || null);
                // Update localStorage with fresh data from API
                if (data.role) {
                  localStorage.setItem('user_role', data.role);
                }
                if (data.username) {
                  localStorage.setItem('user_username', data.username);
                }
                setLoading(false);
                return;
              }
            }
          }
          
          // If no valid session, clear storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_username');
        }
        
        setRole(null);
        setUsername(null);
      } catch (err) {
        console.error('Error checking session:', err);
        setRole(null);
        setUsername(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  return { role, username, loading };
}



// Permission helpers

export function usePermissions() {

  const { role, username, loading } = useUserRole();



  const permissions = {

    // Admin permissions

    isAdmin: role === 'admin',

    

    // Full access (read all)

    canViewAll: ['admin', 'accounts', 'manager'].includes(role || ''),

    

    // Vendor management

    canManageVendors: role === 'admin',

    

    // Ingredient management

    canManageIngredients: ['admin', 'accounts', 'manager'].includes(role || ''),

    canViewIngredients: true, // All roles

    

    // Intend (requisition) management

    canCreateIntend: ['admin', 'accounts', 'manager', 'staff'].includes(role || ''),

    canApproveIntend: ['admin', 'accounts', 'manager'].includes(role || ''),

    canViewIntends: true, // All roles

    

    // Purchase Order management

    canCreatePO: ['admin', 'accounts', 'manager'].includes(role || ''),

    canApprovePO: ['admin', 'accounts', 'manager'].includes(role || ''),

    canViewPO: ['admin', 'accounts', 'manager'].includes(role || ''),

    

    // GRN (Goods Receipt) management

    canReceiveStock: ['admin', 'accounts', 'manager'].includes(role || ''),

    canViewGRN: ['admin', 'accounts', 'manager'].includes(role || ''),

    

    // Payment management

    canRecordPayment: ['admin', 'accounts'].includes(role || ''),

    canViewPayments: ['admin', 'accounts', 'manager'].includes(role || ''),

    

    // Sales management

    canRecordSales: ['admin', 'accounts'].includes(role || ''),

    canViewSales: ['admin', 'accounts'].includes(role || ''),

    

    // Stock management

    canViewStockMovements: true, // All roles

    canAdjustStock: ['admin', 'accounts', 'manager'].includes(role || ''),

    

    // Recipe management

    canManageRecipes: ['admin', 'accounts'].includes(role || ''),

    canViewRecipes: true, // All roles

  };



  return { ...permissions, role, username, loading };

}

