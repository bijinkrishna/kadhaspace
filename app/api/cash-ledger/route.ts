import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Fetch payments (Debit/Expenditure) - PO payments
    let paymentsQuery = supabase
      .from('payments')
      .select(`
        id,
        payment_number,
        payment_date,
        amount,
        payment_method,
        status,
        created_at,
        vendors (
          name
        ),
        purchase_orders (
          po_number
        )
      `)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dateFrom) {
      paymentsQuery = paymentsQuery.gte('payment_date', dateFrom);
    }
    if (dateTo) {
      paymentsQuery = paymentsQuery.lte('payment_date', dateTo);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    // Fetch other expense payments (Debit/Expenditure)
    let expensePaymentsQuery = supabase
      .from('other_expense_payments')
      .select(`
        id,
        payment_date,
        amount,
        method,
        reference,
        created_at,
        other_expenses!inner (
          id,
          expense_date,
          amount,
          tax_amount,
          category:expense_categories (
            name
          ),
          vendor:vendors (
            name
          )
        )
      `)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dateFrom) {
      expensePaymentsQuery = expensePaymentsQuery.gte('payment_date', dateFrom);
    }
    if (dateTo) {
      expensePaymentsQuery = expensePaymentsQuery.lte('payment_date', dateTo);
    }

    const { data: expensePayments, error: expensePaymentsError } = await expensePaymentsQuery;

    if (expensePaymentsError) {
      console.error('Error fetching expense payments:', expensePaymentsError);
      // Don't throw, just log - continue with other data
    }

    // Fetch sales (Credit/Revenue)
    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        sale_number,
        sale_date,
        total_revenue,
        status,
        created_at
      `)
      .eq('status', 'processed')
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dateFrom) {
      salesQuery = salesQuery.gte('sale_date', dateFrom);
    }
    if (dateTo) {
      salesQuery = salesQuery.lte('sale_date', dateTo);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      throw salesError;
    }

    // Transform PO payments to ledger entries (Debit)
    const poPaymentEntries = (payments || []).map((payment: any) => ({
      id: payment.id,
      transaction_id: payment.payment_number,
      date: payment.payment_date,
      type: 'DEBIT' as const,
      category: 'Expenditure',
      description: `Payment to ${payment.vendors?.name || 'Vendor'} - PO: ${payment.purchase_orders?.po_number || 'N/A'}`,
      amount: payment.amount,
      payment_method: payment.payment_method,
      reference: payment.payment_number,
      linked_id: payment.id, // For linking to payment receipt
      linked_type: 'payment' as const,
      created_at: payment.created_at,
    }));

    // Transform expense payments to ledger entries (Debit)
    const expensePaymentEntries = (expensePayments || []).map((expensePayment: any) => {
      const expense = expensePayment.other_expenses;
      const totalAmount = (expense?.amount || 0) + (expense?.tax_amount || 0);
      const categoryName = expense?.category?.name || 'Other Expense';
      const vendorName = expense?.vendor?.name;
      
      return {
        id: `expense-payment-${expensePayment.id}`,
        transaction_id: `EXP-${expensePayment.id}`,
        date: expensePayment.payment_date,
        type: 'DEBIT' as const,
        category: 'Other Expense',
        description: `Other Expense Payment - ${categoryName}${vendorName ? ` (${vendorName})` : ''}`,
        amount: expensePayment.amount || 0,
        payment_method: expensePayment.method,
        reference: expensePayment.reference || `EXP-${expensePayment.id}`,
        linked_id: expensePayment.id,
        linked_type: 'expense_payment' as const,
        created_at: expensePayment.created_at,
      };
    });

    // Combine all debit entries
    const debitEntries = [...poPaymentEntries, ...expensePaymentEntries];

    // Transform sales to ledger entries (Credit)
    const creditEntries = (sales || []).map((sale: any) => ({
      id: sale.id,
      transaction_id: sale.sale_number,
      date: sale.sale_date,
      type: 'CREDIT' as const,
      category: 'Revenue',
      description: `Sale - ${sale.sale_number}`,
      amount: sale.total_revenue,
      payment_method: null,
      reference: sale.sale_number,
      linked_id: sale.id,
      linked_type: 'sale' as const,
      created_at: sale.created_at,
    }));

    // Combine and sort by date (most recent first)
    const allTransactions = [...debitEntries, ...creditEntries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA; // Most recent first
      }
      // If same date, sort by created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Calculate running balance (starting from most recent transaction and going backwards)
    // Reverse to calculate from oldest to newest
    const reversed = [...allTransactions].reverse();
    let balance = 0;
    const transactionsWithBalance = reversed.map((transaction) => {
      if (transaction.type === 'CREDIT') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
      return {
        ...transaction,
        balance,
      };
    });

    // Reverse back to most recent first
    const finalTransactions = transactionsWithBalance.reverse();

    // Calculate totals
    const totalDebits = debitEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCredits = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const netBalance = totalCredits - totalDebits;

    return NextResponse.json({
      transactions: finalTransactions,
      summary: {
        totalDebits,
        totalCredits,
        netBalance,
        debitCount: debitEntries.length,
        creditCount: creditEntries.length,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error fetching cash ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash ledger', message: error.message },
      { status: 500 }
    );
  }
}
