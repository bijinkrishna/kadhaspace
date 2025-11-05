'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Trash2, Loader2, ArrowLeft, Package, Calendar, User, DollarSign, CreditCard, Plus } from 'lucide-react';
import Link from 'next/link';
import { Toast } from '@/app/components/Toast';
import { IntendDetailsModal } from '@/app/components/IntendDetailsModal';

interface POItem {
  id: string;
  po_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_price: number;
  total_price: number;
  intend_item_id: string | null;
  item_status?: 'pending' | 'partial' | 'received';
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  intend_id: string | null;
  status: 'pending' | 'confirmed' | 'partially_received' | 'received';
  vendor_id: string;
  total_amount: number;
  actual_receivable_amount?: number | null;
  total_paid?: number | null;
  payment_status?: string | null;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  intend_name?: string | null;
  received_items_count?: number;
  total_items_count?: number;
  received_percentage?: number;
  vendor?: {
    id: string;
    name: string;
    contact: string;
    email: string | null;
  } | null;
  items?: POItem[];
}

export default function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [poId, setPoId] = useState<string>('');
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIntendModal, setShowIntendModal] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setPoId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (poId) {
      fetchPO();
      fetchPayments(poId);
    }
  }, [poId]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/purchase-orders/${poId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Purchase order not found');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch purchase order');
      }
      const data = await response.json();
      setPO(data);
    } catch (error) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch purchase order';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (poId: string) => {
    try {
      const response = await fetch(`/api/payments?po_id=${poId}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleDeletePO = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete purchase order');
      }

      showToast('Purchase order deleted successfully', 'success');
      setShowDeleteModal(false); // Close modal before redirecting
      router.push('/purchase-orders');
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete purchase order';
      showToast(message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Purchase order not found'}</p>
          <Link
            href="/purchase-orders"
            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  const isPending = po.status === 'pending';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">Pending</span>;
      case 'confirmed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Confirmed</span>;
      case 'partially_received':
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">Partially Received</span>;
      case 'received':
        return <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Received</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">{status}</span>;
    }
  };

  const handleReceiveStock = (poId: string) => {
    // Navigate to GRN page or open receive modal
    router.push(`/grns?po_id=${poId}`);
  };

  return (
    <>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header with PO Number and Status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono">{po.po_number}</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created: {formatDate(po.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(po.status)}
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Receipt Progress Summary */}
        {po.status === 'partially_received' || po.status === 'received' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-700 mb-1">Receipt Progress</div>
                <div className="text-2xl font-bold text-blue-900">
                  {po.received_items_count || 0} / {po.total_items_count || 0} items received
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700 mb-1">Overall Progress</div>
                <div className="text-2xl font-bold text-blue-900">
                  {po.received_percentage?.toFixed(0) || 0}%
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${po.received_percentage || 0}%` }}
              ></div>
            </div>
          </div>
        ) : null}

        {/* Info Cards - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: Source Intend */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" />
              Source
            </h3>
            {po.intend_id ? (
              <button
                onClick={() => setShowIntendModal(true)}
                className="text-lg font-medium text-blue-600 hover:text-blue-800 underline transition-colors text-left"
              >
                {po.intend_name || po.intend_id}
              </button>
            ) : (
              <p className="text-sm text-gray-500">Direct PO</p>
            )}
          </div>

          {/* Right: Vendor */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
              <User className="w-3 h-3" />
              Vendor
            </h3>
            <p className="text-lg font-medium text-gray-900">{po.vendor?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600 mt-1">{po.vendor?.contact || '-'}</p>
            {po.expected_delivery_date && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Expected: {formatDate(po.expected_delivery_date)}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Ingredient</th>
                <th className="px-4 py-3 text-center">Unit</th>
                <th className="px-4 py-3 text-right">Ordered</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items && po.items.length > 0 ? (
                po.items.map((item) => {
                  const receivedQty = item.quantity_received || 0;
                  const orderedQty = item.quantity_ordered;
                  const percentage = orderedQty > 0 ? (receivedQty / orderedQty * 100) : 0;
                  
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{item.ingredient_name}</td>
                      <td className="px-4 py-3 text-center">{item.unit}</td>
                      <td className="px-4 py-3 text-right">{orderedQty}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={percentage < 100 ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {receivedQty}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.item_status === 'received' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Received
                          </span>
                        ) : item.item_status === 'partial' ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            Partial
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">₹{item.unit_price?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{(orderedQty * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary Line */}
          <div className="bg-blue-50 px-4 py-3 flex justify-between items-center border-t-2 border-blue-200">
            <span className="text-sm font-medium text-gray-700">
              Total Items: {po.items?.length || 0}
            </span>
            <span className="text-lg font-bold text-gray-900">
              Grand Total: ₹{po.total_amount?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {po.notes && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700">{po.notes}</p>
          </div>
        )}

        {/* Payment Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payment Details
            </h2>
            {po && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Record Payment
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">PO Amount</div>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{po?.total_amount?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">Actual Receivable</div>
                <div className="text-2xl font-bold text-purple-700">
                  ₹{(po?.actual_receivable_amount || po?.total_amount || 0).toLocaleString()}
                </div>
                <div className="text-xs text-purple-600 mt-1">Based on GRN prices</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-700">
                  ₹{po?.total_paid?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-orange-600 mb-1">Outstanding</div>
                <div className="text-2xl font-bold text-orange-700">
                  ₹{((po?.actual_receivable_amount || po?.total_amount || 0) - (po?.total_paid || 0)).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Payment Status</div>
                <div
                  className={`text-lg font-bold capitalize ${
                    po?.payment_status === 'paid'
                      ? 'text-green-700'
                      : po?.payment_status === 'partial'
                        ? 'text-orange-700'
                        : 'text-gray-700'
                  }`}
                >
                  {po?.payment_status || 'unpaid'}
                </div>
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Payment #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Method
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{payment.payment_number}</td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                              {payment.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-right">
                            ₹{payment.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                payment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => router.push(`/payments/${payment.id}`)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No payments recorded yet</p>
                <p className="text-sm mt-1">Click "Record Payment" to add a payment</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {isPending && (
            <button
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowDeleteModal(true)}
              disabled={isUpdating}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {po.status === 'partially_received' && (
            <button
              onClick={() => handleReceiveStock(po.id)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Receive Remaining Items
            </button>
          )}
        </div>
      </div>

      {/* Delete PO Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Purchase Order</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{po.po_number}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeletePO();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUpdating}
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intend Details Modal */}
      {showIntendModal && po.intend_id && (
        <IntendDetailsModal
          intendId={po.intend_id}
          isOpen={showIntendModal}
          onClose={() => setShowIntendModal(false)}
          onSuccess={() => {
            setShowIntendModal(false);
            // Optionally refresh PO data
            fetchPO();
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && po && (
        <PaymentModalQuick
          po={{
            id: po.id,
            po_number: po.po_number,
            vendor_name: (po.vendor as any)?.name || (po as any).vendors?.name,
            total_amount: po.total_amount,
            actual_receivable_amount: po.actual_receivable_amount,
            total_paid: po.total_paid || 0,
            outstanding_amount: (po.actual_receivable_amount || po.total_amount || 0) - (po.total_paid || 0),
          }}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchPO();
            fetchPayments(poId);
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}

function PaymentModalQuick({ po, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    po_id: po.id,
    payment_date: new Date().toISOString().split('T')[0],
    amount: po.actual_receivable_amount
      ? po.actual_receivable_amount - (po.total_paid || 0) // Use actual receivable
      : po.outstanding_amount, // Fallback to original calculation
    payment_method: 'bank_transfer',
    transaction_reference: '',
    bank_name: '',
    remarks: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if it's a GRN value warning
        if (result.warning && result.details) {
          const warningMessage = 
            `⚠️ WARNING: ${result.warning}\n\n` +
            `Details:\n` +
            `• GRN Value: ₹${result.details.grnTotalValue?.toLocaleString() || '0'}\n` +
            `• Current Total Paid: ₹${result.details.currentTotalPaid?.toLocaleString() || '0'}\n` +
            `• Payment Amount: ₹${result.details.paymentAmount?.toLocaleString() || '0'}\n` +
            `• Total After Payment: ₹${result.details.totalPaidAfterPayment?.toLocaleString() || '0'}\n` +
            `• GRN Count: ${result.details.grnCount || 0}\n\n` +
            `Please verify the GRN and adjust the payment amount accordingly.`;
          
          alert(warningMessage);
          throw new Error(result.warning);
        }
        throw new Error(result.error || result.warning || 'Failed to create payment');
      }

      alert(`✅ Payment ${result.payment.payment_number} created!`);
      onSuccess();
    } catch (error: any) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Record Payment for {po.po_number}</h3>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">PO Amount</div>
              <div className="font-bold">₹{po.total_amount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Actual Receivable</div>
              <div className="font-bold text-blue-600">
                ₹{(po.actual_receivable_amount || po.total_amount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Paid</div>
              <div className="font-bold text-green-600">₹{po.total_paid.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Outstanding</div>
              <div className="font-bold text-orange-600">
                ₹{((po.actual_receivable_amount || po.total_amount) - po.total_paid).toLocaleString()}
              </div>
            </div>
          </div>
          {po.actual_receivable_amount && po.actual_receivable_amount !== po.total_amount && (
            <div className="mt-2 text-xs text-blue-600">
              ⓘ Amount adjusted based on actual invoice prices from GRN
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Date</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Transaction Reference</label>
            <input
              type="text"
              value={formData.transaction_reference}
              onChange={(e) =>
                setFormData({ ...formData, transaction_reference: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="UTR/Cheque number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
