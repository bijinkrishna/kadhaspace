'use client';

import { useState, useEffect } from 'react';
import { Eye, Loader2, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PurchaseOrder } from '@/types';
import { Loading } from '@/app/components/Loading';
import { Toast } from '@/app/components/Toast';
import { ReceiveStockModal } from '@/app/components/ReceiveStockModal';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface POWithVendor extends PurchaseOrder {
  vendor_name?: string | null;
  vendor?: { id: string; name: string } | null;
  items_count?: number;
  total_items_count?: number;
  received_items_count?: number;
  received_percentage?: number;
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<POWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [receivingPOId, setReceivingPOId] = useState<string | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const { sortedData, handleSort, getSortDirection, sortConfig } = useSortable(purchaseOrders);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/purchase-orders');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch purchase orders');
      }
      const result = await response.json();
      
      // Transform the data to match the expected format
      const purchaseOrders = (result.data || []).map((po: any) => {
        // Handle vendor - can be object or array
        const vendor = Array.isArray(po.vendor) ? po.vendor[0] : po.vendor;
        
        // Handle intend - can be object or array
        const intend = Array.isArray(po.intend) ? po.intend[0] : po.intend;
        
        // Count items
        const itemsCount = Array.isArray(po.po_items) ? po.po_items.length : 0;
        
        return {
          ...po,
          vendor_name: vendor?.name || null,
          vendor: vendor || null,
          items_count: itemsCount,
          total_items_count: po.total_items_count || itemsCount,
          received_items_count: po.received_items_count || 0,
          received_percentage: po.received_percentage || 0,
        };
      });
      
      setPurchaseOrders(purchaseOrders);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      const message = error instanceof Error ? error.message : 'Failed to load purchase orders';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveStock = (poId: string) => {
    setReceivingPOId(poId);
    setShowReceiveModal(true);
  };

  const fetchPOs = fetchPurchaseOrders;

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
        </div>

        {purchaseOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No purchase orders yet</p>
          </div>
        ) : (
          <div className="w-full bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="PO Number"
                    sortKey="po_number"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Date"
                    sortKey="created_at"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Vendor"
                    sortKey="vendor_name"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Items"
                    sortKey="items_count"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="center"
                  />
                  <SortableHeader
                    label="Amount"
                    sortKey="total_amount"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Receipt Status"
                    sortKey="received_percentage"
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900 font-mono transition-colors"
                      >
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(po.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {po.vendor_name || po.vendor?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">
                        {po.items_count !== undefined ? po.items_count : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(po.total_amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {po.total_items_count && po.total_items_count > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[60px]">
                            <div className="text-xs text-gray-600 mb-1">
                              {po.received_items_count || 0}/{po.total_items_count}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  (po.received_percentage || 0) >= 100 ? 'bg-green-500' :
                                  (po.received_percentage || 0) > 0 ? 'bg-orange-500' :
                                  'bg-gray-400'
                                }`}
                                style={{ width: `${po.received_percentage || 0}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {po.received_percentage?.toFixed(0) || 0}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No items</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {po.status === 'pending' && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          Pending
                        </span>
                      )}
                      {po.status === 'confirmed' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Confirmed
                        </span>
                      )}
                      {po.status === 'partially_received' && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          Partial
                        </span>
                      )}
                      {po.status === 'received' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Received
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/purchase-orders/${po.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1 transition-colors"
                          aria-label="View purchase order"
                          title="View purchase order"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                        {(po.status === 'pending' || po.status === 'confirmed' || po.status === 'partially_received') && (
                          <button
                            onClick={() => handleReceiveStock(po.id)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium transition-colors"
                            aria-label="Receive stock"
                            title="Receive stock"
                          >
                            <PackageCheck className="w-4 h-4" />
                            {po.status === 'partially_received' ? 'Receive More' : 'Receive'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReceiveModal && receivingPOId && (
        <ReceiveStockModal
          poId={receivingPOId}
          isOpen={showReceiveModal}
          onClose={() => {
            setShowReceiveModal(false);
            setReceivingPOId(null);
          }}
          onSuccess={() => {
            fetchPOs();
            setShowReceiveModal(false);
            setReceivingPOId(null);
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
