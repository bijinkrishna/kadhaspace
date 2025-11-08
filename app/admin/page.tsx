'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2, Shield, Database, Sprout, Users } from 'lucide-react';
import { Toast } from '@/app/components/Toast';
import { usePermissions } from '@/lib/usePermissions';
import { RoleGate } from '@/app/components/RoleGate';
import Link from 'next/link';

export default function AdminPage() {
  const { isAdmin, loading } = usePermissions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [seedResult, setSeedResult] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleDeleteAllTransactions = async () => {
    if (confirmationText !== 'DELETE ALL TRANSACTIONS') {
      showToast('Please type the exact confirmation text', 'error');
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const response = await fetch(
        '/api/admin/delete-all-transactions?confirm=DELETE_ALL_TRANSACTIONS',
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to delete transactions');
      }

      setDeleteResult(result);
      showToast('All transaction data deleted successfully', 'success');
      setShowDeleteModal(false);
      setConfirmationText('');
    } catch (error: any) {
      console.error('Error deleting transactions:', error);
      showToast(error.message || 'Failed to delete transactions', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedTransactionData = async () => {
    setIsSeeding(true);
    setSeedResult(null);

    try {
      const response = await fetch('/api/admin/seed-transaction-data', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to seed transaction data');
      }

      setSeedResult(result);
      showToast('Transaction data seeded successfully', 'success');
    } catch (error: any) {
      console.error('Error seeding transactions:', error);
      showToast(error.message || 'Failed to seed transaction data', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Admin Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administrative tools and system management
          </p>
        </div>

        {/* User Management */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                User Management
              </h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage users, roles, and permissions. Create, update, or delete user accounts.
            </p>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="w-5 h-5" />
              Manage Users
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-red-200 dark:border-red-900/50 shadow-sm">
          <div className="p-6 border-b border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-100">
                Danger Zone
              </h2>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
              These actions are irreversible. Use with extreme caution.
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Delete All Transaction Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This will permanently delete all transaction data including:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                  <li>All sales and sale items</li>
                  <li>All payments (PO payments and expense payments)</li>
                  <li>All GRNs and GRN items</li>
                  <li>All purchase orders and PO items</li>
                  <li>All intends and intend items</li>
                  <li>All stock movements and adjustments</li>
                  <li>All other expenses and their payments</li>
                </ul>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What will be preserved:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                  <li>Ingredients (master data - stock will be reset to 0)</li>
                  <li>Vendors (master data)</li>
                  <li>Recipes (master data)</li>
                  <li>Users (master data)</li>
                  <li>Categories (master data)</li>
                </ul>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ This operation cannot be undone. Make sure you have a backup before proceeding.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete All Transactions
            </button>
          </div>
        </div>

        {/* Seed Transaction Data */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Sprout className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Seed Transaction Data
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will create test transaction data for all transaction tables including:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                <li>Intends and intend items</li>
                <li>Purchase orders and PO items</li>
                <li>GRNs and GRN items</li>
                <li>Payments (for purchase orders)</li>
                <li>Sales and sale items</li>
                <li>Production consumption records</li>
                <li>Other expenses and expense payments</li>
                <li>Stock movements</li>
                <li>Stock adjustments</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <strong>Note:</strong> This requires existing master data (ingredients, vendors, recipes, expense categories).
                The seed will use existing data or create minimal test data as needed.
              </p>
            </div>
            <button
              onClick={handleSeedTransactionData}
              disabled={isSeeding}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSeeding && <Loader2 className="w-5 h-5 animate-spin" />}
              <Sprout className="w-5 h-5" />
              {isSeeding ? 'Seeding Data...' : 'Seed Transaction Data'}
            </button>

            {seedResult && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                  Seeding Complete
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                  Total records created: {seedResult.totalCreated || 0}
                </p>
                {seedResult.createdCounts && (
                  <div className="text-xs text-green-700 dark:text-green-300">
                    <p className="font-medium mb-1">Created by table:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(seedResult.createdCounts).map(([table, count]) => (
                        <li key={table}>
                          {table}: {count as number}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {seedResult.errors && seedResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
                    <p className="font-medium mb-1">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {seedResult.errors.slice(0, 5).map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* System Information */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                System Information
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>This admin panel provides access to system-wide operations.</p>
              <p>All actions are logged and require admin privileges.</p>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Confirm Deletion
                </h3>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                  ⚠️ WARNING: This action is IRREVERSIBLE
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You are about to delete ALL transaction data from the system. This includes all
                  sales, payments, purchase orders, GRNs, intends, stock movements, and expenses.
                  Master data (ingredients, vendors, recipes, users) will be preserved, but all
                  transaction history will be permanently lost.
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  To confirm, please type: <strong>DELETE ALL TRANSACTIONS</strong>
                </p>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type the confirmation text here"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isDeleting}
                />
              </div>

              {deleteResult && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                    Deletion Complete
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                    Total records deleted: {deleteResult.totalDeleted || 0}
                  </p>
                  {deleteResult.deletedCounts && (
                    <div className="text-xs text-green-700 dark:text-green-300">
                      <p className="font-medium mb-1">Deleted by table:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {Object.entries(deleteResult.deletedCounts).map(([table, count]) => (
                          <li key={table}>
                            {table}: {count as number}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmationText('');
                    setDeleteResult(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllTransactions}
                  disabled={
                    isDeleting || confirmationText !== 'DELETE ALL TRANSACTIONS'
                  }
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Delete All Transactions'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </RoleGate>
  );
}

