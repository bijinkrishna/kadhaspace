'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { Loading } from '@/app/components/Loading';
import { Toast } from '@/app/components/Toast';

interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string | null;
  address: string | null;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  total_paid: number;
  outstanding_amount: number;
  grns: any[];
  payments: any[];
}

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  purchase_orders?: {
    po_number: string;
  };
}

interface GRN {
  id: string;
  grn_number: string;
  received_date: string;
  status: string;
  purchase_orders?: {
    po_number: string;
  };
}

interface Statistics {
  totalPOs: number;
  totalPOAmount: number;
  totalGRNs: number;
  totalPayments: number;
  outstandingAmount: number;
  poStatusCounts: {
    pending: number;
    confirmed: number;
    partially_received: number;
    received: number;
  };
}

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string>('');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setVendorId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (vendorId) {
      fetchVendorDashboard();
    }
  }, [vendorId]);

  const fetchVendorDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vendors/${vendorId}/dashboard`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch vendor dashboard');
      }

      const data = await response.json();
      setVendor(data.vendor);
      setPurchaseOrders(data.purchaseOrders || []);
      setPayments(data.payments || []);
      setGrns(data.grns || []);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error fetching vendor dashboard:', error);
      const message = error instanceof Error ? error.message : 'Failed to load vendor dashboard';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      partially_received: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partial' },
      received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Received' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Vendor not found</p>
        <Link href="/vendors" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Vendors
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/vendors"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-gray-600 mt-1">{vendor.contact}</p>
          </div>
        </div>

        {/* Vendor Details Card */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="text-sm font-medium text-gray-900">{vendor.contact}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{vendor.email || 'N/A'}</p>
            </div>
            {vendor.address && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-sm font-medium text-gray-900">{vendor.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">Total POs</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalPOs}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">Total PO Amount</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalPOAmount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">Total Payments</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalPayments)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-gray-600">Outstanding</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.outstandingAmount)}</p>
            </div>
          </div>
        )}

        {/* PO Status Summary */}
        {statistics && (
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">PO Status Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{statistics.poStatusCounts.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{statistics.poStatusCounts.confirmed}</p>
                <p className="text-sm text-gray-500">Confirmed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{statistics.poStatusCounts.partially_received}</p>
                <p className="text-sm text-gray-500">Partial</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{statistics.poStatusCounts.received}</p>
                <p className="text-sm text-gray-500">Received</p>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Orders */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Purchase Orders ({purchaseOrders.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">GRNs</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/purchase-orders/${po.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {po.po_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(po.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                        {formatCurrency(po.total_paid || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                        {formatCurrency(po.outstanding_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {po.grns?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/purchase-orders/${po.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Payments ({payments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.slice(0, 10).map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.payment_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.purchase_orders?.po_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent GRNs */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Recent GRNs ({grns.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GRN Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No GRNs found
                    </td>
                  </tr>
                ) : (
                  grns.slice(0, 10).map((grn) => (
                    <tr key={grn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {grn.grn_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(grn.received_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grn.purchase_orders?.po_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {grn.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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

