'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ShoppingBag,
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Printer,
  AlertCircle
} from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';

interface SaleDetail {
  id: string;
  sale_number: string;
  sale_date: string;
  total_dishes: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  status: string;
  notes: string;
  processed_at: string;
  sale_items: any[];
  production_consumption: any[];
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [saleId, setSaleId] = useState<string>('');
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setSaleId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (saleId) {
      fetchSale();
    }
  }, [saleId]);

  const fetchSale = async () => {
    if (!saleId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/${saleId}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error('Sale not found');
      
      const data = await response.json();
      setSale(data);
    } catch (error) {
      console.error('Error fetching sale:', error);
      alert('Failed to load sale details');
      router.push('/sales');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading sale details...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Sale not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - Hide on print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => router.push('/sales')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Sales
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
        </div>

        {/* Sale Header */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <ShoppingBag className="w-10 h-10 text-green-600" />
                {sale.sale_number}
              </h1>
              <p className="text-lg text-gray-600">
                {new Date(sale.sale_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 ${
                sale.status === 'processed' 
                  ? 'bg-green-100 text-green-800'
                  : sale.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {sale.status === 'processed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {sale.status.toUpperCase()}
              </span>
              {sale.processed_at && (
                <div className="text-xs text-gray-500 mt-2">
                  Processed: {new Date(sale.processed_at).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>

          {sale.notes && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Notes:</div>
              <div className="text-blue-800">{sale.notes}</div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
              <DollarSign className="w-8 h-8" />
              ₹{formatNumber(sale.total_revenue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{sale.total_dishes} dishes sold</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Cost (COGS)</div>
            <div className="text-3xl font-bold text-orange-600">
              ₹{formatNumber(sale.total_cost)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Production cost</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Gross Profit</div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{formatNumber(sale.gross_profit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Revenue - Cost</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Profit Margin
            </div>
            <div className={`text-3xl font-bold ${
              sale.profit_margin >= 30 ? 'text-green-600' :
              sale.profit_margin >= 15 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {Math.round(sale.profit_margin)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {sale.profit_margin >= 30 ? 'Excellent' : 
               sale.profit_margin >= 15 ? 'Good' : 'Low'}
            </div>
          </div>
        </div>

        {/* Dishes Sold */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Dishes Sold</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Dish</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">COGS</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Profit</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sale.sale_items.map((item: any) => {
                    const margin = item.total_revenue > 0 
                      ? ((item.profit / item.total_revenue) * 100) 
                      : 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.recipes?.name}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">₹{formatNumber(item.selling_price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ₹{formatNumber(item.total_revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          ₹{formatNumber(item.total_cost)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">
                          ₹{formatNumber(item.profit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            margin >= 30 ? 'bg-green-100 text-green-800' :
                            margin >= 15 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {Math.round(margin)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ingredient Consumption */}
        {sale.status === 'processed' && sale.production_consumption.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="w-6 h-6 text-orange-600" />
                Ingredient Consumption
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Ingredients used in production (deducted from stock)
              </p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ingredient</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Quantity Used</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sale.production_consumption.map((consumption: any) => (
                      <tr key={consumption.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{consumption.ingredients?.name}</td>
                        <td className="px-4 py-3 text-right">
                          {consumption.quantity_consumed} {consumption.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ₹{formatNumber(consumption.cost_per_unit || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600">
                          ₹{formatNumber(consumption.total_cost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">TOTAL CONSUMPTION COST:</td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        ₹{formatNumber(sale.production_consumption.reduce((sum: number, c: any) => 
                          sum + (c.total_cost || 0), 0
                        ))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pending Status Message */}
        {sale.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <div className="font-semibold text-yellow-900 mb-1">Sale Not Processed Yet</div>
              <div className="text-sm text-yellow-800">
                This sale is pending. Go to the sales list and click "Process" to update inventory stock levels based on this sale.
              </div>
            </div>
          </div>
        )}
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
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}


