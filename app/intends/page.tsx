'use client';

import { useState, useEffect } from 'react';
import { Plus, Eye, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Intend } from '@/types';
import { Toast } from '@/app/components/Toast';
import { NewIntendModal } from '@/app/components/NewIntendModal';
import { IntendDetailsModal } from '@/app/components/IntendDetailsModal';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface IntendWithVendor extends Intend {
  vendor_name?: string | null;
  vendor?: { id: string; name: string } | null;
  items_count?: number;
  items?: Array<{
    id: string;
    ingredient_id: string;
    quantity: number;
    ingredient?: {
      id: string;
      name: string;
      unit: string;
    } | null;
  }>;
}

interface ViewIntendModalProps {
  isOpen: boolean;
  onClose: () => void;
  intendId: string | null;
}

function ViewIntendModal({ isOpen, onClose, intendId }: ViewIntendModalProps) {
  const [intend, setIntend] = useState<IntendWithVendor | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && intendId) {
      fetchIntend();
    } else {
      setIntend(null);
    }
  }, [isOpen, intendId]);

  const fetchIntend = async () => {
    if (!intendId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/intends/${intendId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch intend');
      }
      const data = await response.json();
      setIntend(data);
    } catch (error) {
      console.error('Error fetching intend:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Intend Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : intend ? (
            <div className="space-y-6">
              {/* Intend ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intend ID
                </label>
                <p className="text-lg font-mono font-semibold text-gray-900">{intend.name}</p>
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <p className="text-base text-gray-900">
                  {intend.vendor_name || intend.vendor?.name || (
                    <span className="text-gray-400 italic">No vendor</span>
                  )}
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    intend.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : intend.status === 'partially_fulfilled'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {intend.status === 'pending'
                    ? 'Pending'
                    : intend.status === 'partially_fulfilled'
                    ? 'Partially Fulfilled'
                    : 'Fulfilled'}
                </span>
              </div>

              {/* Notes */}
              {intend.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{intend.notes}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items ({intend.items?.length || 0})
                </label>
                {intend.items && intend.items.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ingredient
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {intend.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.ingredient?.name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.ingredient?.unit || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No items added yet.</p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <p className="text-sm text-gray-600">
                    {format(new Date(intend.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Updated
                  </label>
                  <p className="text-sm text-gray-600">
                    {format(new Date(intend.updated_at), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Failed to load intend details.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntendsPage() {
  const [intends, setIntends] = useState<IntendWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsCounts, setItemsCounts] = useState<Record<string, number>>({});
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; intendId: string | null }>({
    isOpen: false,
    intendId: null,
  });
  const [viewingIntendId, setViewingIntendId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isNewIntendModalOpen, setIsNewIntendModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { sortedData, handleSort, sortConfig } = useSortable(intends);

  useEffect(() => {
    fetchIntends();
  }, []);

  useEffect(() => {
    if (intends.length > 0) {
      fetchItemsCounts();
    }
  }, [intends]);

  const fetchIntends = async () => {
    try {
      setLoading(true); // Start loading
      setError(null); // Clear previous errors
      
      const response = await fetch('/api/intends');
      
      if (!response.ok) {
        throw new Error('Failed to fetch intends');
      }
      
      const data = await response.json();
      console.log('Fetched intends:', data); // Debug log
      
      setIntends(data);
    } catch (error) {
      console.error('Error fetching intends:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load intends';
      setError(errorMessage);
      showToast('Failed to load intends', 'error');
    } finally {
      setLoading(false); // IMPORTANT: Always stop loading
    }
  };

  const fetchItemsCounts = async () => {
    const counts: Record<string, number> = {};
    const promises = intends.map(async (intend) => {
      try {
        const response = await fetch(`/api/intends/${intend.id}`);
        if (response.ok) {
          const data = await response.json();
          counts[intend.id] = data.items?.length || 0;
        }
      } catch (error) {
        console.error(`Error fetching items for intend ${intend.id}:`, error);
        counts[intend.id] = 0;
      }
    });
    await Promise.all(promises);
    setItemsCounts(counts);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadgeClass = (status: Intend['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partially_fulfilled':
        return 'bg-amber-100 text-amber-800';
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Intend['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'partially_fulfilled':
        return 'Partially Fulfilled';
      case 'fulfilled':
        return 'Fulfilled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error loading intends</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchIntends();
            }}
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
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Intends</h1>
          <button
            onClick={() => setIsNewIntendModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Intend</span>
          </button>
        </div>

        {intends.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No intends found. Create your first intend to get started.</p>
          </div>
        ) : (
          <div className="w-full bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
              <thead className="bg-gray-50">
                    <tr>
                  <SortableHeader
                    label="Date"
                    sortKey="created_at"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Intend ID"
                    sortKey="name"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Items
                      </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((intend) => (
                  <tr key={intend.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(intend.created_at)}
                      </div>
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                            {intend.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                              intend.status
                            )}`}
                          >
                        {getStatusLabel(intend.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {itemsCounts[intend.id] !== undefined ? (
                          itemsCounts[intend.id]
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        )}
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                        onClick={() => {
                          setViewingIntendId(intend.id);
                          setIsDetailsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors inline-flex items-center gap-1"
                        aria-label="View intend"
                        title="View intend"
                      >
                        <Eye className="w-5 h-5" />
                        <span>View</span>
                    </button>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
            </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ViewIntendModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, intendId: null })}
        intendId={viewModal.intendId}
      />

      <NewIntendModal
        isOpen={isNewIntendModalOpen}
        onClose={() => setIsNewIntendModalOpen(false)}
        onSuccess={() => {
          // Refresh intends list
          fetchIntends();
          setIsNewIntendModalOpen(false);
        }}
      />

      {viewingIntendId && (
        <IntendDetailsModal
          intendId={viewingIntendId}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingIntendId(null);
          }}
          onSuccess={() => {
            fetchIntends(); // Refresh list
            setIsDetailsModalOpen(false);
            setViewingIntendId(null);
          }}
        />
      )}
    </>
  );
}
