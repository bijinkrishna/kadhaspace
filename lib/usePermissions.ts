import { useEffect, useState } from 'react';

import { createBrowserClient } from '@supabase/ssr';



export type UserRole = 'admin' | 'accounts' | 'manager' | 'staff' | null;



export function useUserRole() {

  const [role, setRole] = useState<UserRole>(null);

  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );



  useEffect(() => {

    async function fetchRole() {

      try {

        const { data, error } = await supabase.rpc('get_user_role');

        

        if (error) {

          console.error('Error fetching role:', error);

          setRole(null);

        } else {

          setRole(data as UserRole);

        }

      } catch (err) {

        console.error('Error:', err);

        setRole(null);

      } finally {

        setLoading(false);

      }

    }



    fetchRole();

  }, [supabase]);



  return { role, loading };

}



// Permission helpers

export function usePermissions() {

  const { role, loading } = useUserRole();



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



  return { ...permissions, role, loading };

}

