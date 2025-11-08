'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, Plus, Loader2, X } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import { Loading } from '@/app/components/Loading';
import { Toast } from '@/app/components/Toast';

interface ExpensePayment {
  id: string;
  payment_date: string;
  amount: number;
  method: string | null;
  reference: string | null;
}

interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  total_paid: number;
  outstanding_amount: number;
  payment_status: string;
  notes: string | null;
  category?: { name: string; code: string } | null;
  vendor?: { name: string } | null;
  payments?: ExpensePayment[];
}

export default function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [expenseId, setExpenseId] = useState<string>('');
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setExpenseId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (expenseId) {
      fetchExpense();
    }
  }, [expenseId]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/other-expenses/${expenseId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Expense not found');
        }
        throw new Error('Failed to fetch expense');
      }
      
      const data = await response.json();
      setExpense(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load expense';
      setError(message);
      showToast(message, 'error');
      console.error('Error loading expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return <Loading message="Loading expense details..." />;
  }

  if (error || !expense) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error loading expense</p>
          <p className="text-sm mt-1">{error || 'Expense not found'}</p>
          <button
            onClick={() => router.push('/expenses')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = (expense.amount || 0) + (expense.tax_amount || 0);

  return (
    <>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/expenses')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expense Details</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {expense.expense_date} • {expense.category?.name || 'Uncategorized'}
              </p>
            </div>
          </div>
        </div>

        {/* Expense Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ₹{formatNumber(totalAmount)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              ₹{formatNumber(expense.amount || 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tax</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              ₹{formatNumber(expense.tax_amount || 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                expense.payment_status === 'paid'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : expense.payment_status === 'partial'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}
            >
              {expense.payment_status?.toUpperCase() || 'UNPAID'}
            </span>
          </div>
        </div>

        {/* Expense Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100">{expense.expense_date}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Category</div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                {expense.category?.name || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Vendor</div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                {expense.vendor?.name || '-'}
              </div>
            </div>
            {expense.notes && (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</div>
                <div className="text-base text-gray-900 dark:text-gray-100">{expense.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payment Details
            </h2>
            {expense.outstanding_amount > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Record Payment
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  ₹{formatNumber(expense.total_paid || 0)}
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">Outstanding</div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  ₹{formatNumber(expense.outstanding_amount || 0)}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Amount</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  ₹{formatNumber(totalAmount)}
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment History</h3>
              {expense.payments && expense.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                        <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Amount</th>
                        <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Method</th>
                        <th className="p-3 font-medium text-gray-700 dark:text-gray-300">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expense.payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="p-3 text-gray-900 dark:text-gray-100">{payment.payment_date}</td>
                          <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">
                            ₹{formatNumber(payment.amount || 0)}
                          </td>
                          <td className="p-3 text-gray-900 dark:text-gray-100">
                            {payment.method || '-'}
                          </td>
                          <td className="p-3 text-gray-900 dark:text-gray-100">
                            {payment.reference || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No payments recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && expense && (
        <PaymentModal
          expense={expense}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchExpense();
            showToast('Payment recorded successfully', 'success');
          }}
        />
      )}

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

function PaymentModal({
  expense,
  onClose,
  onSuccess,
}: {
  expense: Expense;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: expense.outstanding_amount || 0,
    method: 'cash',
    reference: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/other-expenses/${expense.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to record payment');
      }

      onSuccess();
    } catch (error: any) {
      alert('❌ ' + (error.message || 'Failed to record payment'));
      console.error('Error recording payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Record Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">Total Amount</div>
              <div className="font-bold text-gray-900 dark:text-gray-100">
                ₹{formatNumber((expense.amount || 0) + (expense.tax_amount || 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Outstanding</div>
              <div className="font-bold text-orange-600 dark:text-orange-400">
                ₹{formatNumber(expense.outstanding_amount || 0)}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
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
              max={expense.outstanding_amount || 0}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum: ₹{formatNumber(expense.outstanding_amount || 0)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference (optional)
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Transaction reference, cheque number, etc."
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.amount <= 0 || formData.amount > (expense.outstanding_amount || 0)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


