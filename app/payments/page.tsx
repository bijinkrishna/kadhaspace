'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  X,
  Search,
  Users,
} from 'lucide-react';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  status: string;
  vendors: {
    name: string;
  };
  purchase_orders: {
    po_number: string;
    total_amount: number;
  };
}

interface OutstandingPO {
  id: string;
  po_number: string;
  vendor_name: string;
  total_amount: number;
  actual_receivable_amount?: number;
  total_paid: number;
  outstanding_amount: number;
  payment_status: string;
}

interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string | null;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstandingPOs, setOutstandingPOs] = useState<OutstandingPO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<OutstandingPO | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // Get first and last day of current month for default date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
    };
  };

  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  // Filter payments based on date range and vendor
  const filteredPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.payment_date);
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999); // Include the entire end date
    
    const matchesDate = paymentDate >= startDate && paymentDate <= endDate;
    const matchesVendor = !selectedVendor || payment.vendors?.name === selectedVendor.name;
    
    return matchesDate && matchesVendor;
  });

  // Filter outstanding POs by vendor
  const filteredOutstandingPOs = outstandingPOs.filter((po) => {
    return !selectedVendor || po.vendor_name === selectedVendor.name;
  });

  // Filter vendors based on search term (show all if search term is empty)
  const filteredVendors = vendorSearchTerm.trim()
    ? vendors.filter((vendor) =>
        vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
        vendor.contact.toLowerCase().includes(vendorSearchTerm.toLowerCase())
      )
    : vendors;

  const { sortedData, handleSort, sortConfig } = useSortable(filteredPayments);

  useEffect(() => {
    fetchData();
  }, []);

  // Close vendor dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.vendor-filter-container')) {
        setShowVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payments
      const paymentsRes = await fetch('/api/payments?t=' + Date.now(), {
        cache: 'no-store',
      });
      const paymentsData = await paymentsRes.json();
      setPayments(paymentsData);

      // Fetch outstanding POs
      const outstandingRes = await fetch('/api/payments/outstanding?t=' + Date.now(), {
        cache: 'no-store',
      });
      const outstandingData = await outstandingRes.json();
      setOutstandingPOs(outstandingData);

      // Fetch vendors
      const vendorsRes = await fetch('/api/vendors?t=' + Date.now(), {
        cache: 'no-store',
      });
      const vendorsData = await vendorsRes.json();
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (po?: OutstandingPO) => {
    setSelectedPO(po || null);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setSelectedPO(null);
    setShowPaymentModal(false);
  };

  const handlePaymentCreated = () => {
    closePaymentModal();
    fetchData(); // Refresh data
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading payments...</div>
      </div>
    );
  }

  // Calculate totals based on filtered payments
  const totalPaid = filteredPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOutstanding = filteredOutstandingPOs.reduce(
    (sum, po) => sum + po.outstanding_amount,
    0
  );

  // Calculate filtered period total (all filtered payments)
  const filteredPeriodTotal = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Payments</h1>
            <p className="text-gray-600 mt-1">Track and manage vendor payments</p>
          </div>
          <button
            onClick={() => openPaymentModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Record Payment
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Date Range Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setDateRange(getCurrentMonthRange())}
                  className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  This Month
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), 0, 1);
                    const lastDay = new Date(today.getFullYear(), 11, 31);
                    setDateRange({
                      startDate: firstDay.toISOString().split('T')[0],
                      endDate: lastDay.toISOString().split('T')[0],
                    });
                  }}
                  className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  This Year
                </button>
                <button
                  onClick={() => {
                    const startDate = new Date(2000, 0, 1);
                    const endDate = new Date(2100, 11, 31);
                    setDateRange({
                      startDate: startDate.toISOString().split('T')[0],
                      endDate: endDate.toISOString().split('T')[0],
                    });
                  }}
                  className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Show All
                </button>
              </div>
            </div>

            {/* Vendor Filter */}
            <div className="flex-1 vendor-filter-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Vendor Filter
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search vendor by name or contact..."
                    value={vendorSearchTerm}
                    onChange={(e) => {
                      setVendorSearchTerm(e.target.value);
                      setShowVendorDropdown(true);
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {selectedVendor && (
                    <button
                      onClick={() => {
                        setSelectedVendor(null);
                        setVendorSearchTerm('');
                        setShowVendorDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Vendor Dropdown */}
                {showVendorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map((vendor) => (
                        <button
                          key={vendor.id}
                          type="button"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setVendorSearchTerm(vendor.name);
                            setShowVendorDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{vendor.name}</div>
                          <div className="text-sm text-gray-500">{vendor.contact}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No vendors found
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Vendor Display */}
                {selectedVendor && !showVendorDropdown && (
                  <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">{selectedVendor.name}</div>
                      <div className="text-sm text-blue-700">{selectedVendor.contact}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedVendor(null);
                        setVendorSearchTerm('');
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredPayments.length}</span> of{' '}
              <span className="font-semibold">{payments.length}</span> payments
              {selectedVendor && (
                <span className="ml-2 text-blue-600">
                  • Filtered by: <span className="font-semibold">{selectedVendor.name}</span>
                </span>
              )}
            </div>
            {selectedVendor && (
              <button
                onClick={() => {
                  setSelectedVendor(null);
                  setVendorSearchTerm('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear Vendor Filter
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Paid</div>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">₹{totalPaid.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredPayments.filter((p) => p.status === 'completed').length} payments
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Outstanding</div>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ₹{totalOutstanding.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredOutstandingPOs.length} pending POs
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">This Month</div>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ₹{filteredPeriodTotal.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {dateRange.startDate === getCurrentMonthRange().startDate &&
              dateRange.endDate === getCurrentMonthRange().endDate
                ? 'Current month'
                : 'Filtered period'}
            </div>
          </div>
        </div>

        {/* Outstanding Payables */}
        {filteredOutstandingPOs.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Outstanding Payables
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {filteredOutstandingPOs.map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{po.po_number}</div>
                      <div className="text-sm text-gray-600">{po.vendor_name}</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-sm text-gray-600">Total Amount</div>
                      <div className="font-semibold">₹{po.total_amount.toLocaleString()}</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-sm text-gray-600">Paid</div>
                      <div className="font-semibold text-green-600">
                        ₹{po.total_paid.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-sm text-gray-600">Outstanding</div>
                      <div className="font-semibold text-orange-600">
                        ₹{po.outstanding_amount.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => openPaymentModal(po)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Pay Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="Payment #"
                    sortKey="payment_number"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Date"
                    sortKey="payment_date"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Vendor"
                    sortKey="vendors.name"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="PO #"
                    sortKey="purchase_orders.po_number"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Method"
                    sortKey="payment_method"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Amount"
                    sortKey="amount"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSortKey={sortConfig?.key as string}
                    sortDirection={sortConfig?.direction || null}
                    onSort={handleSort}
                    align="center"
                  />
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {payments.length === 0
                        ? 'No payments recorded yet'
                        : selectedVendor
                          ? `No payments found for ${selectedVendor.name} in the selected date range`
                          : 'No payments found in the selected date range'}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {payment.payment_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {payment.vendors?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payment.purchase_orders?.po_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
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
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => router.push(`/payments/${payment.id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal po={selectedPO} onClose={closePaymentModal} onSuccess={handlePaymentCreated} />
      )}
    </div>
  );
}

// Payment Modal Component
function PaymentModal({ po, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [pos, setPOs] = useState<OutstandingPO[]>([]);
  const [formData, setFormData] = useState({
    po_id: po?.id || '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: po?.outstanding_amount || '',
    payment_method: 'bank_transfer',
    transaction_reference: '',
    transaction_date: '',
    bank_name: '',
    remarks: '',
  });

  useEffect(() => {
    if (!po) {
      // Fetch all outstanding POs if no PO was pre-selected
      fetchOutstandingPOs();
    }
  }, [po]);

  const fetchOutstandingPOs = async () => {
    try {
      const res = await fetch('/api/payments/outstanding');
      const data = await res.json();
      setPOs(data);
    } catch (error) {
      console.error('Error fetching POs:', error);
    }
  };

  const handlePOChange = (poId: string) => {
    const selectedPO = pos.find((p) => p.id === poId);
    setFormData({
      ...formData,
      po_id: poId,
      amount: selectedPO?.outstanding_amount || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Frontend validation: Check if amount exceeds outstanding
    const paymentAmount = parseFloat(formData.amount);
    if (selectedPO && paymentAmount > selectedPO.outstanding_amount) {
      alert(`❌ Payment amount (₹${paymentAmount.toLocaleString()}) exceeds outstanding amount (₹${selectedPO.outstanding_amount.toLocaleString()}). Please enter a valid amount.`);
      return;
    }

    if (paymentAmount <= 0) {
      alert('❌ Payment amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedFormData = {
        ...formData,
        transaction_reference: formData.transaction_reference?.trim() || null,
        transaction_date: formData.transaction_date?.trim() || null,
        bank_name: formData.bank_name?.trim() || null,
        remarks: formData.remarks?.trim() || null,
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment');
      }

      alert(`✅ Payment ${result.payment.payment_number} created successfully!`);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert('❌ Failed to create payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPO = po || pos.find((p) => p.id === formData.po_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-2xl font-semibold">Record Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Purchase Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Order *
            </label>
            {po ? (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="font-semibold text-gray-900">{po.po_number}</div>
                <div className="text-sm text-gray-600 mt-1">{po.vendor_name}</div>
                <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <div className="text-gray-600">PO Amount</div>
                    <div className="font-semibold">₹{po.total_amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Actual Receivable</div>
                    <div className="font-semibold text-purple-600">
                      ₹{(po.actual_receivable_amount || po.total_amount || 0).toLocaleString()}
                    </div>
                    {po.actual_receivable_amount && po.actual_receivable_amount !== po.total_amount && (
                      <div className="text-xs text-purple-500 mt-1">Based on GRN</div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-600">Paid</div>
                    <div className="font-semibold text-green-600">
                      ₹{po.total_paid.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Outstanding</div>
                    <div className="font-semibold text-orange-600">
                      ₹{po.outstanding_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={formData.po_id}
                onChange={(e) => handlePOChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a Purchase Order</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_number} - {p.vendor_name} - Outstanding: ₹
                    {p.outstanding_amount.toLocaleString()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount * (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedPO?.outstanding_amount}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
              required
            />
            {selectedPO && (
              <>
                {parseFloat(formData.amount) > selectedPO.outstanding_amount && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Payment amount (₹{parseFloat(formData.amount || 0).toLocaleString()}) exceeds outstanding amount (₹{selectedPO.outstanding_amount.toLocaleString()})
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Maximum payable: ₹{selectedPO.outstanding_amount.toLocaleString()} (based on actual receivable amount)
                </p>
              </>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'cash', label: 'Cash', icon: '💵' },
                { value: 'upi', label: 'UPI', icon: '📱' },
                { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                { value: 'card', label: 'Card', icon: '💳' },
                { value: 'cheque', label: 'Cheque', icon: '📝' },
              ].map((method) => (
                <label
                  key={method.value}
                  className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.payment_method === method.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.value}
                    checked={formData.payment_method === method.value}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_method: e.target.value })
                    }
                    className="sr-only"
                  />
                  <span className="text-2xl mb-1">{method.icon}</span>
                  <span className="text-xs font-medium">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional fields based on payment method */}
          {formData.payment_method !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference
                {formData.payment_method === 'cheque' ? ' (Cheque Number)' : ''}
                {formData.payment_method === 'upi' ? ' (UPI Ref/UTR)' : ''}
              </label>
              <input
                type="text"
                value={formData.transaction_reference}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_reference: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={
                  formData.payment_method === 'cheque'
                    ? 'Enter cheque number'
                    : formData.payment_method === 'upi'
                      ? 'Enter UPI reference'
                      : 'Enter transaction reference'
                }
              />
            </div>
          )}

          {(formData.payment_method === 'cheque' || formData.payment_method === 'bank_transfer') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.payment_method === 'cheque' ? 'Cheque Date' : 'Transaction Date'}
                </label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add any notes or remarks..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              disabled={
                loading ||
                !formData.po_id ||
                !formData.amount ||
                (selectedPO && parseFloat(formData.amount) > selectedPO.outstanding_amount) ||
                parseFloat(formData.amount) <= 0
              }
            >
              {loading ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

