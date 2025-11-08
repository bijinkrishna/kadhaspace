import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await _req.json();

    const payload = {
      expense_id: id,
      amount: Math.round(body.amount || 0), // Apply 0 decimal policy
      payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
      method: body.method || null,
      reference: body.reference || null,
    };

    const { data, error } = await supabase
      .from('other_expense_payments')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating expense payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate total paid and update expense payment status
    const { data: payments, error: paymentsError } = await supabase
      .from('other_expense_payments')
      .select('amount')
      .eq('expense_id', id);

    if (!paymentsError && payments) {
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Get expense total
      const { data: expense, error: expenseError } = await supabase
        .from('other_expenses')
        .select('amount, tax_amount')
        .eq('id', id)
        .single();

      if (!expenseError && expense) {
        const totalAmount = (expense.amount || 0) + (expense.tax_amount || 0);
        let payment_status = 'unpaid';
        
        if (totalPaid >= totalAmount) {
          payment_status = 'paid';
        } else if (totalPaid > 0) {
          payment_status = 'partial';
        }

        // Update expense payment status (if the column exists)
        await supabase
          .from('other_expenses')
          .update({ payment_status })
          .eq('id', id);
      }
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

