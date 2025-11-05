'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ShoppingBag, 
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { SalesComparison } from '@/app/components/SalesComparison';

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  total_dishes: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  status: string;
  sale_items: any[];
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchSales();
  }, [statusFilter]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = '/api/sales?t=' + Date.now();
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      setSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id: string, saleNumber: string) => {
    if (!confirm(`Delete sale ${saleNumber}?`)) return;

    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Sale deleted!');
        fetchSales();
      } else {
        const result = await response.json();
        alert('❌ ' + result.error);
      }
    } catch (error) {
      alert('❌ Error deleting sale');
    }
  };

  const handleCancel = async (id: string, saleNumber: string) => {
    const reason = prompt(`Cancel sale ${saleNumber}?\n\nEnter reason for cancellation:`);
    
    if (!reason || reason.trim() === '') {
      return; // User cancelled or didn't provide reason
    }

    try {
      const response = await fetch(`/api/sales/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      if (response.ok) {
        alert('✅ Sale cancelled! Stock has been reversed.');
        fetchSales();
      } else {
        const result = await response.json();
        alert('❌ Failed to cancel sale: ' + result.message);
      }
    } catch (error) {
      console.error('Error cancelling sale:', error);
      alert('❌ Error cancelling sale');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading sales...</div>
      </div>
    );
  }

  // Calculate stats
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
  const totalCost = sales.reduce((sum, s) => sum + (s.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-green-600" />
              Sales & Production
            </h1>
            <p className="text-gray-600 mt-1">Track sales and manage inventory consumption</p>
          </div>
          <button
            onClick={() => router.push('/sales/new')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Sale
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-green-600">
              ₹{totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">{sales.length} sales</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Cost</div>
            <div className="text-3xl font-bold text-orange-600">
              ₹{totalCost.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">COGS</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Gross Profit</div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{totalProfit.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Revenue - Cost</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Margin</div>
            <div className="text-3xl font-bold text-purple-600">
              {avgMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Profit margin</div>
          </div>
        </div>

        {/* Sales Comparison Analysis */}
        <div className="mb-6">
          <SalesComparison />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">All</option>
              <option value="pending">Pending (if any)</option>
              <option value="processed">Processed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="text-xs text-gray-500 ml-2">Sales are automatically processed on creation</span>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sale #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Dishes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No sales records found
                    </td>
                  </tr>
                ) : (
                  sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {sale.sale_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(sale.sale_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">
                        {sale.total_dishes}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                        ₹{sale.total_revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-orange-600">
                        ₹{sale.total_cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                        ₹{sale.gross_profit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          sale.profit_margin >= 30 ? 'bg-green-100 text-green-800' :
                          sale.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {sale.profit_margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center justify-center gap-1 ${
                          sale.status === 'processed' 
                            ? 'bg-green-100 text-green-800'
                            : sale.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {sale.status === 'processed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {sale.status === 'processed' ? 'Processed (Auto)' : sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/sales/${sale.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Only show cancel for processed sales */}
                          {sale.status === 'processed' && (
                            <button
                              onClick={() => handleCancel(sale.id, sale.sale_number)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Cancel Sale"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
