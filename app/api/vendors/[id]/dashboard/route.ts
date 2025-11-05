import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch vendor details
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Fetch all purchase orders for this vendor
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        intend:intends(*),
        po_items(
          *,
          ingredient:ingredients(*)
        )
      `)
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    if (poError) {
      console.error('Error fetching purchase orders:', poError);
    }

    // Fetch all GRNs for POs of this vendor
    const poIds = purchaseOrders?.map((po: any) => po.id) || [];
    let grns: any[] = [];
    if (poIds.length > 0) {
      const { data: grnsData, error: grnError } = await supabase
        .from('grns')
        .select(`
          *,
          purchase_orders(
            po_number
          )
        `)
        .in('po_id', poIds)
        .order('created_at', { ascending: false });

      if (grnError) {
        console.error('Error fetching GRNs:', grnError);
      } else {
        grns = grnsData || [];
      }
    }

    // Fetch all payments for this vendor
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        purchase_orders(
          po_number,
          total_amount
        )
      `)
      .eq('vendor_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Calculate statistics
    const totalPOs = purchaseOrders?.length || 0;
    const totalPOAmount = purchaseOrders?.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0) || 0;
    const totalGRNs = grns.length;
    const totalPayments = payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    // Calculate outstanding amount
    const outstandingAmount = purchaseOrders?.reduce((sum: number, po: any) => {
      const receivableAmount = po.actual_receivable_amount || po.total_amount || 0;
      const paidAmount = po.total_paid || 0;
      return sum + (receivableAmount - paidAmount);
    }, 0) || 0;

    // Calculate PO status counts
    const poStatusCounts = {
      pending: purchaseOrders?.filter((po: any) => po.status === 'pending').length || 0,
      confirmed: purchaseOrders?.filter((po: any) => po.status === 'confirmed').length || 0,
      partially_received: purchaseOrders?.filter((po: any) => po.status === 'partially_received').length || 0,
      received: purchaseOrders?.filter((po: any) => po.status === 'received').length || 0,
    };

    // Transform purchase orders to include GRN and payment info
    const poWithDetails = (purchaseOrders || []).map((po: any) => {
      const poGRNs = grns.filter((grn: any) => grn.po_id === po.id);
      const poPayments = payments?.filter((p: any) => p.po_id === po.id) || [];
      const totalPaid = poPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const receivableAmount = po.actual_receivable_amount || po.total_amount || 0;
      const outstanding = receivableAmount - totalPaid;

      return {
        ...po,
        grns: poGRNs,
        payments: poPayments,
        total_paid: totalPaid,
        outstanding_amount: outstanding,
      };
    });

    return NextResponse.json({
      vendor,
      purchaseOrders: poWithDetails,
      grns,
      payments: payments || [],
      statistics: {
        totalPOs,
        totalPOAmount,
        totalGRNs,
        totalPayments,
        outstandingAmount,
        poStatusCounts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching vendor dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendor dashboard' },
      { status: 500 }
    );
  }
}

