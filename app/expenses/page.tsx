'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/formatNumber';
import { Loading } from '@/app/components/Loading';
import { Toast } from '@/app/components/Toast';
import { X, Loader2 } from 'lucide-react';

type Expense = {
  id: string;
  expense_number?: string;
  expense_date: string;
  category?: { name: string; code: string };
  vendor?: { name: string };
  amount: number;
  tax_amount: number;
  total_amount?: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
};

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; expense?: Expense }>({ open: false });

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/other-expenses');

      if (!res.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const json = await res.json();
      // Calculate total_amount for each expense
      const expensesWithTotal = (json.data || []).map((it: any) => ({
        ...it,
        total_amount: (it.amount || 0) + (it.tax_amount || 0),
      }));
      setItems(expensesWithTotal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load expenses';
      setError(message);
      setToast({ message, type: 'error' });
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  function openDrawer(expense: Expense) {
    setDrawer({ open: true, expense });
  }

  function closeDrawer() {
    setDrawer({ open: false });
  }

  if (loading) {
    return <Loading message="Loading expenses..." />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          <p className="font-semibold">Error loading expenses</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Other Expenses</h1>
          <a
            href="/expenses/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Expense
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Number</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Category</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Vendor</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Tax</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Total</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="p-3 font-medium text-gray-700 dark:text-gray-300"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const totalAmount = it.total_amount || (it.amount || 0) + (it.tax_amount || 0);
                  return (
                    <tr
                      key={it.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="p-3 text-gray-900 dark:text-gray-100">
                        {it.expense_number || `EXP-${it.id.slice(0, 8)}`}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-gray-100">{it.expense_date}</td>
                      <td className="p-3 text-gray-900 dark:text-gray-100">{it.category?.name || '-'}</td>
                      <td className="p-3 text-gray-900 dark:text-gray-100">{it.vendor?.name || '-'}</td>
                      <td className="p-3 text-gray-900 dark:text-gray-100">₹{formatNumber(it.amount || 0)}</td>
                      <td className="p-3 text-gray-900 dark:text-gray-100">₹{formatNumber(it.tax_amount || 0)}</td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">
                        ₹{formatNumber(totalAmount)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            it.payment_status === 'paid'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : it.payment_status === 'partial'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {it.payment_status?.toUpperCase() || 'UNPAID'}
                        </span>
                      </td>
                      <td className="p-3">
                        {it.payment_status !== 'paid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(it);
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No expenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PaymentDrawer
        open={drawer.open}
        expense={drawer.expense}
        onClose={() => {
          closeDrawer();
          load();
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

function PaymentDrawer({
  open,
  expense,
  onClose,
}: {
  open: boolean;
  expense?: Expense;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [outstanding, setOutstanding] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && expense) {
      // Fetch expense details to get accurate outstanding amount
      fetch(`/api/other-expenses/${expense.id}`)
        .then((res) => res.json())
        .then((data) => {
          const outstandingAmount = data.outstanding_amount || data.total_amount || 0;
          setOutstanding(outstandingAmount);
          setAmount(Math.round(outstandingAmount));
        })
        .catch(() => {
          // Fallback to total amount if fetch fails
          const totalAmount = expense.total_amount || (expense.amount || 0) + (expense.tax_amount || 0);
          setOutstanding(totalAmount);
          setAmount(Math.round(totalAmount));
        });

      setDate(new Date().toISOString().slice(0, 10));
      setMethod('cash');
      setReference('');
      setError(null);
    }
  }, [open, expense]);

  if (!open || !expense) return null;

  const totalAmount = expense.total_amount || (expense.amount || 0) + (expense.tax_amount || 0);

  async function save() {
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (amount > outstanding) {
      setError(`Amount cannot exceed outstanding amount of ₹${formatNumber(outstanding)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/other-expenses/${expense.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount), // Apply 0 decimal policy
          payment_date: date,
          method: method || null,
          reference: reference.trim() || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to record payment');
      }

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record payment';
      setError(message);
      console.error('Error recording payment:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex justify-end z-50">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Payment</div>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Expense: <span className="font-medium text-gray-900 dark:text-gray-100">
              {expense.expense_number || `EXP-${expense.id.slice(0, 8)}`}
            </span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Category: <span className="font-medium text-gray-900 dark:text-gray-100">
              {expense.category?.name || '-'}
            </span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Total: <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹{formatNumber(totalAmount)}
            </span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Outstanding: <span className="font-medium text-orange-600 dark:text-orange-400">
              ₹{formatNumber(outstanding)}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max={outstanding}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum: ₹{formatNumber(outstanding)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference (optional)
            </label>
            <input
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction reference"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={loading || amount <= 0 || amount > outstanding}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
