import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Nullable<T> = T | null | undefined;

function parseAmount(value: Nullable<number>) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function startOfMonthISO(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString().slice(0, 10);
}

function startOfPrevMonthISO(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return d.toISOString().slice(0, 10);
}

function endOfPrevMonthISO(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 0);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    const monthStartISO = startOfMonthISO(now);
    const prevMonthStartISO = startOfPrevMonthISO(now);
    const prevMonthEndISO = endOfPrevMonthISO(now);

    const nextSevenDaysISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
      .toISOString()
      .slice(0, 10);

    const [
      { data: mtdSales, error: mtdSalesError },
      { data: prevMonthSales, error: prevMonthSalesError },
      { data: processedSales, error: processedSalesError },
      { data: mtdPayments, error: mtdPaymentsError },
      { data: allVendorPayments, error: allVendorPaymentsError },
      { data: recentPayments, error: recentPaymentsError },
      { data: expenseRows, error: expenseRowsError },
      { data: expensePayments, error: expensePaymentsError },
      { data: outstandingPOs, error: outstandingPOsError },
      { data: recentSales, error: recentSalesError }
    ] = await Promise.all([
      supabase
        .from('sales')
        .select('id, sale_number, sale_date, total_revenue, total_cost, gross_profit')
        .eq('status', 'processed')
        .gte('sale_date', monthStartISO),
      supabase
        .from('sales')
        .select('total_revenue, total_cost, gross_profit, sale_date')
        .eq('status', 'processed')
        .gte('sale_date', prevMonthStartISO)
        .lte('sale_date', prevMonthEndISO),
      supabase
        .from('sales')
        .select('total_revenue, total_cost, gross_profit')
        .eq('status', 'processed'),
      supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('status', 'completed')
        .gte('payment_date', monthStartISO),
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed'),
      supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          payment_date,
          amount,
          purchase_orders (
            po_number
          ),
          vendors (
            name
          )
        `)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(6),
      supabase
        .from('other_expenses')
        .select(`
          id,
          expense_date,
          amount,
          tax_amount,
          payment_status,
          expense_categories (
            name,
            code
          ),
          vendors (
            name
          )
        `)
        .gte('expense_date', prevMonthStartISO),
      supabase
        .from('other_expense_payments')
        .select('expense_id, amount, payment_date'),
      supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          total_amount,
          actual_receivable_amount,
          total_paid,
          payment_status,
          created_at,
          vendors (
            name
          )
        `)
        .in('payment_status', ['unpaid', 'partial'])
        .order('created_at', { ascending: false }),
      supabase
        .from('sales')
        .select('id, sale_number, sale_date, total_revenue, gross_profit')
        .eq('status', 'processed')
        .order('sale_date', { ascending: false })
        .limit(6)
    ]);

    if (mtdSalesError) throw mtdSalesError;
    if (prevMonthSalesError) throw prevMonthSalesError;
    if (processedSalesError) throw processedSalesError;
    if (mtdPaymentsError) throw mtdPaymentsError;
    if (allVendorPaymentsError) throw allVendorPaymentsError;
    if (recentPaymentsError) throw recentPaymentsError;
    if (expenseRowsError) throw expenseRowsError;
    if (expensePaymentsError) throw expensePaymentsError;
    if (outstandingPOsError) throw outstandingPOsError;
    if (recentSalesError) throw recentSalesError;

    const allProcessedRevenue = (processedSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.total_revenue),
      0
    );
    const allProcessedCost = (processedSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.total_cost),
      0
    );
    const allProcessedGrossProfit = (processedSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.gross_profit),
      0
    );

    const mtdRevenue = (mtdSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.total_revenue),
      0
    );
    const mtdCOGS = (mtdSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.total_cost),
      0
    );
    const mtdGrossProfit = (mtdSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.gross_profit),
      0
    );
    const mtdGrossMargin = mtdRevenue > 0 ? (mtdGrossProfit / mtdRevenue) * 100 : 0;

    const prevMonthRevenue = (prevMonthSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.total_revenue),
      0
    );
    const prevMonthGrossProfit = (prevMonthSales || []).reduce(
      (sum, sale: any) => sum + parseAmount(sale.gross_profit),
      0
    );
    const prevMonthGrossMargin = prevMonthRevenue > 0 ? (prevMonthGrossProfit / prevMonthRevenue) * 100 : 0;

    const vendorPaymentsMTD = (mtdPayments || []).reduce(
      (sum, payment: any) => sum + parseAmount(payment.amount),
      0
    );

    const expenseTotals = (expenseRows || []).map((expense: any) => {
      const total = parseAmount(expense.amount) + parseAmount(expense.tax_amount);
      return {
        ...expense,
        total_amount: total
      };
    });

    const expensePaymentsByExpenseId = (expensePayments || []).reduce(
      (acc: Record<string, number>, payment: any) => {
        const key = payment.expense_id as string;
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + parseAmount(payment.amount);
        return acc;
      },
      {}
    );

    const expensesMTD = expenseTotals.filter((expense) => expense.expense_date >= monthStartISO);
    const mtdExpensesTotal = expensesMTD.reduce((sum, expense) => sum + parseAmount(expense.total_amount), 0);

    const expensePaymentsMTD = (expensePayments || [])
      .filter((payment) => payment.payment_date >= monthStartISO)
      .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);

    const netCashFlowMTD = mtdRevenue - (vendorPaymentsMTD + expensePaymentsMTD);

    const outstandingPurchaseOrders = (outstandingPOs || []).map((po: any) => {
      const vendor = Array.isArray(po.vendors) ? po.vendors[0] : po.vendors;
      const amountToConsider = parseAmount(po.actual_receivable_amount) || parseAmount(po.total_amount);
      const totalPaid = parseAmount(po.total_paid);
      const outstandingAmount = Math.max(amountToConsider - totalPaid, 0);

      const createdAt = po.created_at ? new Date(po.created_at) : null;
      const daysOutstanding = createdAt
        ? Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const dueCategory = (() => {
        if (daysOutstanding == null) {
          return 'unknown';
        }
        if (daysOutstanding > 15) {
          return 'overdue';
        }
        if (daysOutstanding >= 7) {
          return 'dueSoon';
        }
        return 'current';
      })();

      return {
        id: po.id,
        po_number: po.po_number,
        vendor_name: vendor?.name || 'Unknown Vendor',
        outstanding_amount: outstandingAmount,
        total_amount: amountToConsider,
        total_paid: totalPaid,
        payment_status: po.payment_status,
        created_at: po.created_at,
        days_outstanding: daysOutstanding,
        due_category: dueCategory
      };
    });

    const totalOutstandingValue = outstandingPurchaseOrders.reduce(
      (sum, po) => sum + parseAmount(po.outstanding_amount),
      0
    );
    const overdueCount = outstandingPurchaseOrders.filter((po) => po.due_category === 'overdue').length;
    const dueSoonCount = outstandingPurchaseOrders.filter((po) => po.due_category === 'dueSoon').length;

    const topOutstanding = outstandingPurchaseOrders
      .slice()
      .sort((a, b) => parseAmount(b.outstanding_amount) - parseAmount(a.outstanding_amount))
      .slice(0, 6);

    const expenseCategoryTotals = expensesMTD.reduce(
      (
        acc: Record<
          string,
          {
            name: string;
            code: string | null;
            total: number;
          }
        >,
        expense: any
      ) => {
        const category = Array.isArray(expense.expense_categories)
          ? expense.expense_categories[0]
          : expense.expense_categories;
        const key = category?.code || category?.name || 'uncategorised';
        if (!acc[key]) {
          acc[key] = {
            name: category?.name || 'Uncategorised',
            code: category?.code || null,
            total: 0
          };
        }
        acc[key].total += parseAmount(expense.total_amount);
        return acc;
      },
      {}
    );

    const topExpenseCategories = Object.values(expenseCategoryTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const unpaidExpenses = expenseTotals.filter(
      (expense) => expense.payment_status === 'unpaid' || expense.payment_status === 'partial'
    );

    const outstandingExpensesValue = unpaidExpenses.reduce((sum, expense) => {
      const totalAmount = parseAmount(expense.total_amount);
      const totalPaid = parseAmount(expensePaymentsByExpenseId[expense.id]);
      return sum + Math.max(totalAmount - totalPaid, 0);
    }, 0);

    const recentExpenseActivity = expenseTotals
      .slice()
      .sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''))
      .slice(0, 6)
      .map((expense) => {
        const vendor = Array.isArray(expense.vendors) ? expense.vendors[0] : expense.vendors;
        const category = Array.isArray(expense.expense_categories)
          ? expense.expense_categories[0]
          : expense.expense_categories;
        const totalAmount = parseAmount(expense.total_amount);
        const paidAmount = parseAmount(expensePaymentsByExpenseId[expense.id]);
        const outstandingAmount = Math.max(totalAmount - paidAmount, 0);

        return {
          id: expense.id,
          expense_date: expense.expense_date,
          vendor_name: vendor?.name || '-',
          category_name: category?.name || 'Uncategorised',
          total_amount: totalAmount,
          outstanding_amount: outstandingAmount,
          payment_status: expense.payment_status
        };
      });

    const recentPaymentsActivity = (recentPayments || []).map((payment: any) => {
      const vendor = Array.isArray(payment.vendors) ? payment.vendors[0] : payment.vendors;
      const purchaseOrder = Array.isArray(payment.purchase_orders)
        ? payment.purchase_orders[0]
        : payment.purchase_orders;

      return {
        id: payment.id,
        payment_number: payment.payment_number,
        payment_date: payment.payment_date,
        amount: parseAmount(payment.amount),
        vendor_name: vendor?.name || 'Unknown Vendor',
        po_number: purchaseOrder?.po_number || '-'
      };
    });

    const recentSalesActivity = (recentSales || []).map((sale: any) => ({
      id: sale.id,
      sale_number: sale.sale_number,
      sale_date: sale.sale_date,
      total_revenue: parseAmount(sale.total_revenue),
      gross_profit: parseAmount(sale.gross_profit)
    }));

    const expensePaymentsTotal = (expensePayments || []).reduce(
      (sum, payment) => sum + parseAmount(payment.amount),
      0
    );
    const vendorPaymentsTotal = (allVendorPayments || []).reduce(
      (sum, payment) => sum + parseAmount(payment.amount),
      0
    );

    const responsePayload = {
      generated_at: todayISO,
      headline: {
        mtdRevenue,
        mtdCOGS,
        mtdGrossProfit,
        mtdGrossMargin,
        previousMonthRevenue: prevMonthRevenue,
        previousMonthGrossProfit: prevMonthGrossProfit,
        previousMonthGrossMargin: prevMonthGrossMargin,
        revenueDelta: mtdRevenue - prevMonthRevenue,
        grossProfitDelta: mtdGrossProfit - prevMonthGrossProfit
      },
      cashFlow: {
        month: {
          inflow: mtdRevenue,
          outflow: vendorPaymentsMTD + expensePaymentsMTD,
          net: netCashFlowMTD,
          vendorPayments: vendorPaymentsMTD,
          expensePayments: expensePaymentsMTD
        },
        lifetime: {
          credits: allProcessedRevenue,
          debits: vendorPaymentsTotal + expensePaymentsTotal,
          net: allProcessedRevenue - (vendorPaymentsTotal + expensePaymentsTotal)
        }
      },
      payables: {
        outstandingCount: outstandingPurchaseOrders.length,
        outstandingValue: totalOutstandingValue,
        overdueCount,
        dueSoonCount,
        watchlist: topOutstanding
      },
      expenses: {
        mtdTotal: mtdExpensesTotal,
        topCategories: topExpenseCategories,
        outstandingCount: unpaidExpenses.length,
        outstandingValue: outstandingExpensesValue,
        recent: recentExpenseActivity
      },
      recentActivity: {
        payments: recentPaymentsActivity,
        expenses: recentExpenseActivity.slice(0, 4),
        sales: recentSalesActivity
      }
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    });
  } catch (error: any) {
    console.error('Error building accounts dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to build accounts dashboard', message: error.message },
      { status: 500 }
    );
  }
}


