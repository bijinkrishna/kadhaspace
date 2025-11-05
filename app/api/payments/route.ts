import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/payments - List all payments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    const poId = searchParams.get('po_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('payments')
      .select(`
        *,
        vendors (
          id,
          name
        ),
        purchase_orders (
          id,
          po_number,
          total_amount
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }
    if (poId) {
      query = query.eq('po_id', poId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    return NextResponse.json(payments || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create new payment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      po_id,
      payment_date,
      amount,
      payment_method,
      transaction_reference,
      transaction_date,
      bank_name,
      remarks,
    } = body;

    // Validate required fields
    if (!po_id || !payment_date || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get PO details with payment information
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*, actual_receivable_amount, total_paid, total_amount')
      .eq('id', po_id)
      .single();

    if (poError || !po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Check if GRN exists for this PO and calculate GRN value
    const { data: grns, error: grnError } = await supabase
      .from('grns')
      .select(`
        id,
        grn_items (
          quantity_received,
          unit_price_actual
        )
      `)
      .eq('po_id', po_id);

    let grnTotalValue = 0;
    let hasGRN = false;

    if (!grnError && grns && grns.length > 0) {
      hasGRN = true;
      // Calculate total GRN value from all GRN items
      for (const grn of grns) {
        if (grn.grn_items && Array.isArray(grn.grn_items)) {
          for (const item of grn.grn_items) {
            const itemValue = (item.quantity_received || 0) * (item.unit_price_actual || 0);
            grnTotalValue += itemValue;
          }
        }
      }
    }

    // Calculate actual receivable amount (use actual_receivable_amount if available, otherwise total_amount)
    const actualReceivableAmount = po.actual_receivable_amount || po.total_amount || 0;
    const totalPaid = po.total_paid || 0;
    const outstandingAmount = actualReceivableAmount - totalPaid;
    const paymentAmount = parseFloat(amount);
    const totalPaidAfterPayment = totalPaid + paymentAmount;

    // Validate payment amount is positive
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    // If GRN exists, check if total paid (including current payment) exceeds GRN value
    if (hasGRN && grnTotalValue > 0) {
      if (totalPaidAfterPayment > grnTotalValue) {
        return NextResponse.json(
          {
            error: 'Payment exceeds GRN value',
            warning: `Total payment amount (₹${totalPaidAfterPayment.toLocaleString()}) exceeds GRN value (₹${grnTotalValue.toLocaleString()}). Please verify the GRN before proceeding.`,
            details: {
              grnTotalValue,
              currentTotalPaid: totalPaid,
              paymentAmount,
              totalPaidAfterPayment,
              grnCount: grns.length,
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate payment amount doesn't exceed outstanding amount
    if (paymentAmount > outstandingAmount) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${paymentAmount.toLocaleString()}) exceeds outstanding amount (₹${outstandingAmount.toLocaleString()})`,
          outstandingAmount,
          actualReceivableAmount,
          totalPaid,
        },
        { status: 400 }
      );
    }

    // Generate payment number
    const { data: paymentNumber, error: numberError } = await supabase.rpc(
      'generate_payment_number'
    );

    if (numberError) throw numberError;

    // Convert empty strings to null for optional fields
    const cleanTransactionDate = transaction_date && transaction_date.trim() !== '' ? transaction_date : null;
    const cleanTransactionReference = transaction_reference && transaction_reference.trim() !== '' ? transaction_reference : null;
    const cleanBankName = bank_name && bank_name.trim() !== '' ? bank_name : null;
    const cleanRemarks = remarks && remarks.trim() !== '' ? remarks : null;

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_number: paymentNumber,
        po_id,
        vendor_id: po.vendor_id,
        payment_date,
        amount: parseFloat(amount),
        payment_method,
        transaction_reference: cleanTransactionReference,
        transaction_date: cleanTransactionDate,
        bank_name: cleanBankName,
        remarks: cleanRemarks,
        status: 'completed',
      })
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    console.log('✅ Payment created:', payment.payment_number);

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', message: error.message },
      { status: 500 }
    );
  }
}

