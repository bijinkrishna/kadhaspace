import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch expense with category and vendor
    const { data: expense, error } = await supabase
      .from('other_expenses')
      .select('*, category:expense_categories(name, code), vendor:vendors(name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw error;
    }

    // Fetch payments for this expense
    const { data: payments, error: paymentsError } = await supabase
      .from('other_expense_payments')
      .select('*')
      .eq('expense_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Calculate payment totals
    const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmount = (expense.amount || 0) + (expense.tax_amount || 0);
    const outstanding = totalAmount - totalPaid;

    // Determine payment status
    let payment_status = 'unpaid';
    if (totalPaid >= totalAmount) {
      payment_status = 'paid';
    } else if (totalPaid > 0) {
      payment_status = 'partial';
    }

    return NextResponse.json({
      ...expense,
      total_amount: totalAmount,
      total_paid: totalPaid,
      outstanding_amount: outstanding,
      payment_status,
      payments: payments || [],
    });
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense', message: error.message },
      { status: 500 }
    );
  }
}


