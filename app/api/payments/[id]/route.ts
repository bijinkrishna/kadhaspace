import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/payments/[id] - Get single payment details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        vendors (
          id,
          name,
          contact,
          email,
          address
        ),
        purchase_orders (
          id,
          po_number,
          total_amount,
          actual_receivable_amount,
          total_paid,
          payment_status,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(payment, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment', message: error.message },
      { status: 500 }
    );
  }
}

