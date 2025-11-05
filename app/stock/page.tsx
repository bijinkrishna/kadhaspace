'use client';

import { useState, useEffect } from 'react';
import { Plus, Download, History, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Ingredient } from '@/types';
import { Loading } from '@/app/components/Loading';
import { Toast } from '@/app/components/Toast';
import { StockAdjustmentModal } from '@/app/components/StockAdjustmentModal';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface StockIngredient extends Ingredient {
  stock_quantity: number;
  reorder_point: number;
}

export default function StockPage() {
  const [ingredients, setIngredients] = useState<StockIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, low, out
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<StockIngredient | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      setError(null);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/stock?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock');
      }
      
      const data = await response.json();
      console.log('=== STOCK FETCH DEBUG ===');
      console.log('Fetched fresh stock', data.length, 'items');
      if (data.length > 0) {
        console.log('First ingredient raw from API:', data[0]);
        console.log('First ingredient values:', {
          name: data[0].name,
          current_stock: data[0].current_stock,
          stock_quantity: data[0].stock_quantity,
          min_stock: data[0].min_stock,
          reorder_point: data[0].reorder_point,
          last_price: data[0].last_price
        });
        // Also log to alert for visibility
        if (data[0]) {
          const firstIng = data[0];
          console.warn(`DEBUG: ${firstIng.name} - current_stock: ${firstIng.current_stock}, stock_quantity: ${firstIng.stock_quantity}`);
        }
      }
      console.log('=== END STOCK FETCH DEBUG ===');
      setIngredients(data);
    } catch (error) {
      console.error('Error fetching stock:', error);
      const message = error instanceof Error ? error.message : 'Failed to load stock';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStock();
    
    // Refresh when user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible - refreshing stock');
        fetchStock();
      }
    };
    
    const handleFocus = () => {
      console.log('Window focused - refreshing stock');
      fetchStock();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const getStockStatus = (ingredient: StockIngredient): 'ok' | 'low' | 'out' => {
    const stock = ingredient.stock_quantity || ingredient.current_stock || 0;
    const reorder = ingredient.reorder_point || ingredient.min_stock || 0;
    
    if (stock === 0) return 'out';
    if (stock <= reorder) return 'low';
    return 'ok';
  };

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStockStatus(ing);
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'low' && status === 'low') ||
      (filterStatus === 'out' && status === 'out');
    return matchesSearch && matchesFilter;
  });

  const { sortedData, handleSort, sortConfig } = useSortable(filteredIngredients);

  const totalValue = ingredients.reduce(
    (sum, ing) => sum + ((ing.stock_quantity || ing.current_stock || 0) * (ing.last_price || 0)),
    0
  );

  const lowStockCount = ingredients.filter((ing) => getStockStatus(ing) === 'low').length;

  const outOfStockCount = ingredients.filter((ing) => getStockStatus(ing) === 'out').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleExportCSV = () => {
    const headers = ['Ingredient', 'Stock Qty', 'Unit', 'Last Price', 'Value', 'Reorder Point', 'Status'];
    const rows = ingredients.map((ing) => {
      const stock = ing.stock_quantity || ing.current_stock || 0;
      const value = stock * (ing.last_price || 0);
      const status = getStockStatus(ing);
      return [
        ing.name,
        stock.toString(),
        ing.unit,
        (ing.last_price || 0).toFixed(2),
        value.toFixed(2),
        (ing.reorder_point || ing.min_stock || 0).toString(),
        status === 'ok' ? 'OK' : status === 'low' ? 'Low' : 'Out',
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                console.log('Manual refresh clicked');
                fetchStock();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Refresh stock data"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => {
                setSelectedIngredient(null);
                setShowAdjustmentModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Stock Adjustment
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            {/* <Link
              href="/stock/history"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Movements History
            </Link> */}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total Items</div>
            <div className="text-2xl font-bold text-gray-900">{ingredients.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Stock Value</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Low Stock</div>
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Stock Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchStock}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortableHeader
                      label="Ingredient"
                      sortKey="name"
                      currentSortKey={sortConfig?.key as string}
                      sortDirection={sortConfig?.direction || null}
                      onSort={handleSort}
                      align="left"
                    />
                    <SortableHeader
                      label="Stock Qty"
                      sortKey="stock_quantity"
                      currentSortKey={sortConfig?.key as string}
                      sortDirection={sortConfig?.direction || null}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Unit"
                      sortKey="unit"
                      currentSortKey={sortConfig?.key as string}
                      sortDirection={sortConfig?.direction || null}
                      onSort={handleSort}
                      align="left"
                    />
                    <SortableHeader
                      label="Last Price"
                      sortKey="last_price"
                      currentSortKey={sortConfig?.key as string}
                      sortDirection={sortConfig?.direction || null}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <SortableHeader
                      label="Reorder Point"
                      sortKey="reorder_point"
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No ingredients found
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((ingredient) => {
                      const status = getStockStatus(ingredient);
                      // Debug: Log the first ingredient's values
                      if (filteredIngredients.indexOf(ingredient) === 0) {
                        console.log('Displaying first ingredient:', {
                          name: ingredient.name,
                          stock_quantity: ingredient.stock_quantity,
                          current_stock: ingredient.current_stock,
                          reorder_point: ingredient.reorder_point,
                          min_stock: ingredient.min_stock,
                          allKeys: Object.keys(ingredient)
                        });
                      }
                      const stock = ingredient.stock_quantity != null ? ingredient.stock_quantity : (ingredient.current_stock != null ? ingredient.current_stock : 0);
                      const reorder = ingredient.reorder_point != null ? ingredient.reorder_point : (ingredient.min_stock != null ? ingredient.min_stock : 0);
                      const value = stock * (ingredient.last_price || 0);

                      return (
                        <tr key={ingredient.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {ingredient.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold">{stock.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ingredient.unit}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(ingredient.last_price || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(value)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{reorder}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                status === 'ok'
                                  ? 'bg-green-100 text-green-800'
                                  : status === 'low'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {status === 'ok' ? 'OK' : status === 'low' ? 'Low' : 'Out'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => {
                                  setSelectedIngredient(ingredient);
                                  setShowAdjustmentModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                              >
                                Adjust
                              </button>
                              <Link
                                href={`/stock/history/${ingredient.id}`}
                                className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                              >
                                History
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <StockAdjustmentModal
          ingredient={selectedIngredient || undefined}
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedIngredient(null);
          }}
          onSuccess={() => {
            fetchStock();
            setShowAdjustmentModal(false);
            setSelectedIngredient(null);
            showToast('Stock adjusted successfully', 'success');
          }}
        />
      )}
    </>
  );
}

