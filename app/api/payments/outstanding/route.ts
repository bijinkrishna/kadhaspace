import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/payments/outstanding - Get POs with outstanding payments
export async function GET() {
  try {
    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        total_amount,
        total_paid,
        actual_receivable_amount,
        payment_status,
        created_at,
        vendors (
          id,
          name
        )
      `)
      .in('payment_status', ['unpaid', 'partial'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate outstanding based on ACTUAL RECEIVABLE (from GRNs)
    const outstandingPOs = (pos || []).map((po: any) => {
      // Use actual_receivable_amount if available, otherwise fall back to total_amount
      const amountToConsider = po.actual_receivable_amount || po.total_amount || 0;
      
      // Handle vendors - Supabase can return object or array
      const vendor = Array.isArray(po.vendors) 
        ? po.vendors[0] 
        : po.vendors;

      return {
        id: po.id,
        po_number: po.po_number,
        vendor_id: vendor?.id,
        vendor_name: vendor?.name || 'Unknown',
        total_amount: po.total_amount || 0,
        actual_receivable_amount: amountToConsider,
        total_paid: po.total_paid || 0,
        outstanding_amount: amountToConsider - (po.total_paid || 0),
        payment_status: po.payment_status,
        created_at: po.created_at,
      };
    });

    return NextResponse.json(outstandingPOs, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error fetching outstanding payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outstanding payments', message: error.message },
      { status: 500 }
    );
  }
}

