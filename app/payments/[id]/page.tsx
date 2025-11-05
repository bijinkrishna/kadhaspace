'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Building,
  Package,
  CheckCircle,
} from 'lucide-react';

interface GRNItem {
  grn_number: string;
  grn_date: string;
  ingredient_name: string;
  quantity_received: number;
  unit: string;
  unit_price_actual: number;
  total: number;
}

interface PaymentDetails {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  transaction_date: string;
  bank_name: string;
  remarks: string;
  status: string;
  created_at: string;
  vendors: {
    id: string;
    name: string;
    contact: string;
    email: string;
    address?: string;
  };
  purchase_orders: {
    id: string;
    po_number: string;
    total_amount: number;
    actual_receivable_amount: number;
    total_paid: number;
    payment_status: string;
    created_at: string;
  };
}

export default function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [paymentId, setPaymentId] = useState<string>('');
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [grnItems, setGrnItems] = useState<GRNItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setPaymentId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  useEffect(() => {
    if (payment) {
      fetchGRNItems();
    }
  }, [payment]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${paymentId}?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Payment not found');
      }

      const data = await response.json();
      setPayment(data);
    } catch (error) {
      console.error('Error fetching payment:', error);
      alert('Failed to load payment details');
      router.push('/payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNItems = async () => {
    try {
      // Use the payment data we already have
      if (payment?.purchase_orders?.id) {
        // Fetch GRN items for this PO
        const grnRes = await fetch(`/api/grns?po_id=${payment.purchase_orders.id}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        const grnData = await grnRes.json();

        // Format GRN items
        const items: GRNItem[] = [];
        grnData.forEach((grn: any) => {
          grn.grn_items?.forEach((item: any) => {
            items.push({
              grn_number: grn.grn_number,
              grn_date: grn.received_date,
              ingredient_name: item.ingredients?.name || 'Unknown',
              quantity_received: item.quantity_received,
              unit: item.ingredients?.unit || '',
              unit_price_actual: item.unit_price_actual,
              total: item.quantity_received * item.unit_price_actual,
            });
          });
        });

        setGrnItems(items);
      }
    } catch (error) {
      console.error('Error fetching GRN items:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading payment receipt...</div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Payment not found</div>
      </div>
    );
  }

  const grnTotal = grnItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header - Hide on print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => router.push('/payments')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Payments
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Payment Receipt */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Receipt Header */}
          <div className="border-b-2 border-gray-200 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">PAYMENT RECEIPT</h1>
                <p className="text-gray-600">Kadha Inventory Management System</p>
                <p className="text-sm text-gray-500 mt-1">Restaurant Inventory & Purchasing</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Receipt Number</div>
                <div className="text-2xl font-bold text-gray-900">{payment.payment_number}</div>
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                    payment.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  {payment.status.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Date and Reference */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-gray-600">Payment Date:</span>
                <span className="ml-2 font-semibold">
                  {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-600">PO Reference:</span>
                <span className="ml-2 font-semibold">{payment.purchase_orders.po_number}</span>
              </div>
            </div>
          </div>

          {/* Vendor and Payment Info */}
          <div className="grid grid-cols-2 gap-8 p-8 border-b">
            {/* Paid To */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                PAID TO
              </h3>
              <div className="text-lg font-bold text-gray-900 mb-2">{payment.vendors.name}</div>
              {payment.vendors.contact && (
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Contact:</span> {payment.vendors.contact}
                </div>
              )}
              {payment.vendors.email && (
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Email:</span> {payment.vendors.email}
                </div>
              )}
              {payment.vendors.address && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Address:</span> {payment.vendors.address}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                PAYMENT METHOD
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Method:</span>
                  <span className="text-sm font-semibold capitalize">
                    {payment.payment_method.replace('_', ' ')}
                  </span>
                </div>
                {payment.transaction_reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reference:</span>
                    <span className="text-sm font-semibold">{payment.transaction_reference}</span>
                  </div>
                )}
                {payment.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bank:</span>
                    <span className="text-sm font-semibold">{payment.bank_name}</span>
                  </div>
                )}
                {payment.transaction_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transaction Date:</span>
                    <span className="text-sm font-semibold">
                      {new Date(payment.transaction_date).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-y-2 border-green-200 p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">AMOUNT PAID</div>
                <div className="text-5xl font-bold text-gray-900">
                  ₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {numberToWords(payment.amount)} Rupees Only
                </div>
              </div>
              <DollarSign className="w-16 h-16 text-green-600 opacity-50" />
            </div>
          </div>

          {/* GRN Items Breakdown */}
          {grnItems.length > 0 && (
            <div className="p-8 border-b">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items Received (Covered by this Payment)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">GRN</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Rate</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grnItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.grn_number}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(item.grn_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3">{item.ingredient_name}</td>
                        <td className="px-4 py-3 text-right">
                          {item.quantity_received} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ₹{item.unit_price_actual.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 font-semibold">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right">
                        Total Receivable:
                      </td>
                      <td className="px-4 py-3 text-right">₹{grnTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* PO Summary */}
          <div className="p-8 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Purchase Order Summary
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-xs text-gray-600 mb-1">PO Amount</div>
                <div className="text-xl font-bold text-gray-900">
                  ₹{payment.purchase_orders.total_amount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-xs text-gray-600 mb-1">Actual Receivable</div>
                <div className="text-xl font-bold text-blue-600">
                  ₹{(
                    payment.purchase_orders.actual_receivable_amount ||
                    payment.purchase_orders.total_amount
                  ).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-xs text-gray-600 mb-1">Total Paid</div>
                <div className="text-xl font-bold text-green-600">
                  ₹{payment.purchase_orders.total_paid.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-xs text-gray-600 mb-1">Balance</div>
                <div className="text-xl font-bold text-orange-600">
                  ₹{(
                    (payment.purchase_orders.actual_receivable_amount ||
                      payment.purchase_orders.total_amount) -
                    payment.purchase_orders.total_paid
                  ).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {payment.remarks && (
            <div className="p-8 border-b">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">REMARKS</h3>
              <p className="text-gray-900">{payment.remarks}</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-8 text-center">
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-600">
                This is a computer-generated receipt and does not require a signature.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              <p>
                Generated on{' '}
                {new Date(payment.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="mt-1">Kadha Inventory Management System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  );
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  if (num === 0) return 'Zero';

  const numStr = Math.floor(num).toString();
  let words = '';

  // Lakhs
  if (numStr.length > 5) {
    const lakhs = parseInt(numStr.slice(0, -5));
    words += numberToWords(lakhs) + ' Lakh ';
  }

  // Thousands
  if (numStr.length > 3) {
    const thousands = parseInt(numStr.slice(-5, -3) || '0');
    if (thousands > 0) {
      words += numberToWords(thousands) + ' Thousand ';
    }
  }

  // Hundreds
  const hundreds = parseInt(numStr.slice(-3, -2) || '0');
  if (hundreds > 0) {
    words += ones[hundreds] + ' Hundred ';
  }

  // Tens and Ones
  const lastTwo = parseInt(numStr.slice(-2));
  if (lastTwo >= 10 && lastTwo < 20) {
    words += teens[lastTwo - 10];
  } else {
    const tensDigit = parseInt(numStr.slice(-2, -1) || '0');
    const onesDigit = parseInt(numStr.slice(-1));
    words += tens[tensDigit] + ' ' + ones[onesDigit];
  }

  return words.trim();
}

