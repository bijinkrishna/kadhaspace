'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  CreditCard,
  FileSpreadsheet,
  LineChart,
  Loader2,
  ScrollText,
  ShoppingCart,
  Wallet2,
  AlertTriangle,
  CalendarClock,
  ExternalLink
} from 'lucide-react';
import { AccountsOnly } from '@/app/components/RoleGate';

type ExpenseActivity = {
  id: string;
  expense_date: string;
  vendor_name: string;
  category_name: string;
  total_amount: number;
  outstanding_amount: number;
  payment_status: string;
};

type PaymentActivity = {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  vendor_name: string;
  po_number: string;
};

type SalesActivity = {
  id: string;
  sale_number: string;
  sale_date: string;
  total_revenue: number;
  gross_profit: number;
};

interface AccountsDashboardData {
  generated_at: string;
  headline: {
    mtdRevenue: number;
    mtdCOGS: number;
    mtdGrossProfit: number;
    mtdGrossMargin: number;
    previousMonthRevenue: number;
    previousMonthGrossProfit: number;
    previousMonthGrossMargin: number;
    revenueDelta: number;
    grossProfitDelta: number;
  };
  cashFlow: {
    month: {
      inflow: number;
      outflow: number;
      net: number;
      vendorPayments: number;
      expensePayments: number;
    };
    lifetime: {
      credits: number;
      debits: number;
      net: number;
    };
  };
  payables: {
    outstandingCount: number;
    outstandingValue: number;
    overdueCount: number;
    dueSoonCount: number;
    watchlist: Array<{
      id: string;
      po_number: string;
      vendor_name: string;
      outstanding_amount: number;
      total_amount: number;
      total_paid: number;
      payment_status: string;
      created_at: string;
      days_outstanding: number | null;
      due_category: 'overdue' | 'dueSoon' | 'current' | 'unknown';
    }>;
  };
  expenses: {
    mtdTotal: number;
    topCategories: Array<{
      name: string;
      code: string | null;
      total: number;
    }>;
    outstandingCount: number;
    outstandingValue: number;
    recent: ExpenseActivity[];
  };
  recentActivity: {
    payments: PaymentActivity[];
    expenses: ExpenseActivity[];
    sales: SalesActivity[];
  };
}

function formatCurrency(value: number, fractionDigits = 0) {
  if (!Number.isFinite(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

function formatPercent(value: number, fractionDigits = 1) {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(fractionDigits)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return value;
  }
}

function DeltaPill({ value }: { value: number }) {
  if (!Number.isFinite(value) || value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
        —
      </span>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const pillClass = isPositive
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${pillClass}`}>
      <Icon className="w-3 h-3" />
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

export default function AccountsDashboardPage() {
  const [data, setData] = useState<AccountsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch('/api/accounts/dashboard', {
          cache: 'no-store'
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to fetch accounts dashboard');
        }

        const payload = (await response.json()) as AccountsDashboardData;
        if (mounted) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load accounts dashboard', err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load accounts dashboard'
          );
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    const interval = setInterval(load, 60 * 1000); // refresh every minute

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const headlineCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: 'MTD Revenue',
        value: formatCurrency(data.headline.mtdRevenue),
        delta: data.headline.revenueDelta,
        description: 'vs previous month total',
        icon: <LineChart className="w-5 h-5 text-slate-600" />
      },
      {
        label: 'MTD Gross Profit',
        value: formatCurrency(data.headline.mtdGrossProfit),
        delta: data.headline.grossProfitDelta,
        description: 'vs previous month total',
        icon: <Banknote className="w-5 h-5 text-emerald-600" />
      },
      {
        label: 'Gross Margin',
        value: formatPercent(data.headline.mtdGrossMargin),
        delta: data.headline.mtdGrossMargin - data.headline.previousMonthGrossMargin,
        description: 'change vs previous month',
        icon: <ScrollText className="w-5 h-5 text-purple-600" />,
        deltaFormatter: (delta: number) => `${delta.toFixed(1)} pts`
      },
      {
        label: 'Outstanding Payables',
        value: formatCurrency(data.payables.outstandingValue),
        description: `${data.payables.outstandingCount} supplier dues`,
        icon: <CreditCard className="w-5 h-5 text-orange-600" />,
        highlight: data.payables.overdueCount > 0 ? `${data.payables.overdueCount} overdue` : undefined
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading accounts dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-red-200 text-red-700 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-semibold">Unable to load accounts dashboard</h2>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <AccountsOnly
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
            <p className="mt-2 text-sm text-gray-600">
              This workspace is available only for accounts users.
            </p>
          </div>
        </div>
      }
    >
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts Command Center</h1>
            <p className="text-sm text-gray-600">
              All financial controls & quick actions for the accounts team
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Updated {formatDate(data.generated_at)}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {headlineCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.label}
              </span>
              {card.icon}
            </div>
            <div className="text-2xl font-semibold text-gray-900">{card.value}</div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{card.description}</span>
              {'delta' in card && card.delta !== undefined ? (
                card.deltaFormatter ? (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      card.deltaFormatter(card.delta).startsWith('-')
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {card.deltaFormatter(card.delta)}
                  </span>
                ) : (
                  <DeltaPill value={card.delta} />
                )
              ) : null}
            </div>
            {card.highlight && (
              <div className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg">
                {card.highlight}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wallet2 className="w-5 h-5 text-slate-600" />
              Cash Flow Snapshot (MTD)
            </h2>
            <Link
              href="/cash-ledger"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cash Ledger <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-xs font-medium text-emerald-700 uppercase">Cash Inflow</div>
              <div className="mt-2 text-xl font-semibold text-emerald-900">
                {formatCurrency(data.cashFlow.month.inflow)}
              </div>
              <div className="mt-1 text-xs text-emerald-700 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Sales receipts processed
              </div>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="text-xs font-medium text-red-700 uppercase">Cash Outflow</div>
              <div className="mt-2 text-xl font-semibold text-red-900">
                {formatCurrency(data.cashFlow.month.outflow)}
              </div>
              <div className="mt-1 text-xs text-red-700 space-y-1">
                <div className="flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  Vendor payments: {formatCurrency(data.cashFlow.month.vendorPayments)}
                </div>
                <div className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" />
                  Expense payouts: {formatCurrency(data.cashFlow.month.expensePayments)}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-600 uppercase">Net Cash Movement</div>
              <div className={`mt-2 text-xl font-semibold ${
                data.cashFlow.month.net >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {formatCurrency(data.cashFlow.month.net)}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Vendor & expense payments vs sales inflows
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-medium text-gray-600 uppercase">Cumulative Position</div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-gray-900">Credits:</span>{' '}
                {formatCurrency(data.cashFlow.lifetime.credits)}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Debits:</span>{' '}
                {formatCurrency(data.cashFlow.lifetime.debits)}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Net:</span>{' '}
                <span
                  className={
                    data.cashFlow.lifetime.net >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'
                  }
                >
                  {formatCurrency(data.cashFlow.lifetime.net)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Accounts Springboard</h2>
            <CalendarClock className="w-5 h-5 text-slate-600" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/payments"
              className="group flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">Record vendor payment</div>
                <p className="text-xs text-gray-500">Capture a payment against supplier POs</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <Link
              href="/purchase-orders"
              className="group flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">Review outstanding POs</div>
                <p className="text-xs text-gray-500">Prioritise dues & reconcile GRNs</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <Link
              href="/expenses/new"
              className="group flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">Log other expense</div>
                <p className="text-xs text-gray-500">Capture invoice & supporting details</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <Link
              href="/cash-ledger"
              className="group flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">Drill cash ledger</div>
                <p className="text-xs text-gray-500">Full ledger with drill downs</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <Link
              href="/vendors"
              className="group flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">Manage vendors</div>
                <p className="text-xs text-gray-500">Contact info, rates & performance</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <Link
              href="/expenses"
              className="group flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">Track expense payouts</div>
                <p className="text-xs text-gray-500">Clear dues & manage categories</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payables Watchlist</h2>
              <p className="text-xs text-gray-500 mt-1">
                Prioritise clearances – {data.payables.overdueCount} overdue • {data.payables.dueSoonCount} due soon
              </p>
            </div>
            <Link
              href="/purchase-orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Manage POs <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-6">
            {data.payables.watchlist.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-10">
                No outstanding purchase order payments. Great job!
              </div>
            ) : (
              <div className="space-y-4">
                {data.payables.watchlist.map((po) => (
                  <div
                    key={po.id}
                    className="border border-gray-200 rounded-lg px-4 py-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">{po.po_number}</div>
                      <div
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          po.due_category === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : po.due_category === 'dueSoon'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {po.due_category === 'overdue'
                          ? 'Overdue'
                          : po.due_category === 'dueSoon'
                          ? 'Due soon'
                          : 'Current'}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{po.vendor_name}</div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>
                        Outstanding{' '}
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(po.outstanding_amount)}
                        </span>
                      </span>
                      <span>
                        Paid{' '}
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(po.total_paid)}
                        </span>
                      </span>
                      <span>
                        Raised {formatDate(po.created_at)}
                      </span>
                      <span>
                        {po.days_outstanding != null ? `${po.days_outstanding} days outstanding` : 'Age n/a'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Expense Insights</h2>
              <p className="text-xs text-gray-500 mt-1">
                ₹{(data.expenses.mtdTotal / 1000).toFixed(1)}K incurred this month •{' '}
                {data.expenses.outstandingCount} expenses pending {formatCurrency(data.expenses.outstandingValue)}
              </p>
            </div>
            <Link
              href="/expenses"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Top categories (MTD)</h3>
              <div className="mt-3 space-y-2">
                {data.expenses.topCategories.length === 0 ? (
                  <div className="text-xs text-gray-500">No expense data available this month.</div>
                ) : (
                  data.expenses.topCategories.map((category) => (
                    <div key={category.code || category.name} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <span className="text-gray-600">{formatCurrency(category.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Recent expense entries</h3>
              <div className="mt-3 space-y-3">
                {data.expenses.recent.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{expense.category_name}</span>
                      <span className="text-gray-500">{formatDate(expense.expense_date)}</span>
                    </div>
                    <div className="mt-1">{expense.vendor_name}</div>
                    <div className="mt-1 flex items-center gap-3">
                      <span>Total {formatCurrency(expense.total_amount)}</span>
                      {expense.outstanding_amount > 0 ? (
                        <span className="text-orange-600 font-semibold">
                          Outstanding {formatCurrency(expense.outstanding_amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Settled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Latest activity</h2>
          <p className="text-xs text-gray-500 mt-1">
            Quick scan of payments, expenses & sales processed recently
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Payments</h3>
            {data.recentActivity.payments.length === 0 ? (
              <p className="text-xs text-gray-500">No recent vendor payments.</p>
            ) : (
              data.recentActivity.payments.map((payment) => (
                <div key={payment.id} className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{payment.payment_number}</span>
                    <span className="text-gray-500">{formatDate(payment.payment_date)}</span>
                  </div>
                  <div className="mt-1">{payment.vendor_name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-semibold text-emerald-700">
                      {formatCurrency(payment.amount)}
                    </span>
                    <span className="text-gray-400">PO {payment.po_number}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-6 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Expenses</h3>
            {data.recentActivity.expenses.length === 0 ? (
              <p className="text-xs text-gray-500">No recent other expenses logged.</p>
            ) : (
              data.recentActivity.expenses.map((expense) => (
                <div key={expense.id} className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{expense.category_name}</span>
                    <span className="text-gray-500">{formatDate(expense.expense_date)}</span>
                  </div>
                  <div className="mt-1">{expense.vendor_name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(expense.total_amount)}
                    </span>
                    {expense.outstanding_amount > 0 ? (
                      <span className="text-orange-600">Due {formatCurrency(expense.outstanding_amount)}</span>
                    ) : (
                      <span className="text-emerald-600">Paid</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-6 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Sales</h3>
            {data.recentActivity.sales.length === 0 ? (
              <p className="text-xs text-gray-500">No processed sales records yet.</p>
            ) : (
              data.recentActivity.sales.map((sale) => (
                <div key={sale.id} className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{sale.sale_number}</span>
                    <span className="text-gray-500">{formatDate(sale.sale_date)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-semibold text-emerald-700">
                      {formatCurrency(sale.total_revenue)}
                    </span>
                    <span className="text-gray-500">
                      GP {formatCurrency(sale.gross_profit)} ({formatPercent(
                        sale.total_revenue > 0 ? (sale.gross_profit / sale.total_revenue) * 100 : 0
                      )})
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
    </AccountsOnly>
  );
}


