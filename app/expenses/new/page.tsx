'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Toast } from '@/app/components/Toast';
import { Loading } from '@/app/components/Loading';

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const [cats, setCats] = useState<ExpenseCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories and vendors in parallel
      const [catsRes, vendorsRes] = await Promise.all([
        fetch('/api/expense-categories'),
        fetch('/api/vendors'),
      ]);

      if (!catsRes.ok) {
        throw new Error('Failed to fetch expense categories');
      }

      const catsJson = await catsRes.json();
      setCats(catsJson.data || []);

      if (vendorsRes.ok) {
        const vendorsJson = await vendorsRes.json();
        setVendors(vendorsJson || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      setToast({ message, type: 'error' });
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const fd = new FormData(e.currentTarget);
      const payload: any = Object.fromEntries(fd.entries());

      // Apply 0 decimal policy - round amounts to whole numbers
      payload.amount = Math.round(Number(payload.amount) || 0);
      payload.tax_amount = Math.round(Number(payload.tax_amount || 0));

      // Remove vendor_id if empty
      if (!payload.vendor_id || payload.vendor_id.trim() === '') {
        delete payload.vendor_id;
      }

      // Remove notes if empty
      if (!payload.notes || payload.notes.trim() === '') {
        delete payload.notes;
      }

      const res = await fetch('/api/other-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save expense');
      }

      setToast({ message: 'Expense created successfully', type: 'success' });
      setTimeout(() => {
        router.push('/expenses');
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save expense';
      setError(message);
      setToast({ message, type: 'error' });
      console.error('Error saving expense:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading message="Loading form data..." />;
  }

  return (
    <>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Add Expense</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Record a new expense transaction
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="expense_date"
              name="expense_date"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div>
            <label htmlFor="category_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category_code"
              name="category_code"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select category…</option>
              {cats.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vendor (optional)
            </label>
            <select
              id="vendor_id"
              name="vendor_id"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select vendor (optional)…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="1"
                min="0"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label htmlFor="tax_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Amount
              </label>
              <input
                type="number"
                id="tax_amount"
                name="tax_amount"
                step="1"
                min="0"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
                defaultValue="0"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Additional notes about this expense..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>

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


