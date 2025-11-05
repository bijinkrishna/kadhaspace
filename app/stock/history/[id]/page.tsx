'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Ingredient } from '@/types';
import { Loading } from '@/app/components/Loading';

interface StockMovement {
  id: string;
  ingredient_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'opening' | 'wastage';
  quantity: number;
  balance_after: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  remarks: string | null;
  movement_date: string;
  created_at: string;
}

interface IngredientWithStock extends Ingredient {
  stock_quantity?: number;
}

export default function StockHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [ingredientId, setIngredientId] = useState<string>('');
  const [ingredient, setIngredient] = useState<IngredientWithStock | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [grnToPoMap, setGrnToPoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setIngredientId(resolvedParams.id);
    }
    init();
  }, [params]);

  const fetchData = async () => {
    setLoading(true);
    try {
      setError(null);
      const timestamp = new Date().getTime();
      
      // Fetch ingredient details with no-cache
      const ingResponse = await fetch(`/api/ingredients/${ingredientId}?_t=${timestamp}`, {
        cache: 'no-store'
      });
      if (!ingResponse.ok) {
        throw new Error('Failed to fetch ingredient');
      }
      const ingData = await ingResponse.json();
      console.log('Fetched ingredient:', ingData); // Debug
      setIngredient({
        ...ingData,
        stock_quantity: ingData.current_stock || ingData.stock_quantity || 0,
      });

      // Fetch movements with no-cache
      const movResponse = await fetch(`/api/stock/movements/${ingredientId}?_t=${timestamp}`, {
        cache: 'no-store'
      });
      if (!movResponse.ok) {
        throw new Error('Failed to fetch movements');
      }
      const movData = await movResponse.json();
      console.log('Fetched movements:', movData.length, 'movements'); // Debug
      setMovements(movData);

      // Fetch GRN to PO mapping for GRN movements
      const grnIds = movData
        .filter((m: StockMovement) => m.reference_type === 'grn' && m.reference_id)
        .map((m: StockMovement) => m.reference_id!);

      if (grnIds.length > 0) {
        try {
          // Fetch GRNs in batch
          const uniqueGrnIds = [...new Set(grnIds)] as string[];
          const grnPromises = uniqueGrnIds.map(async (grnId: string) => {
            try {
              const res = await fetch(`/api/grns/${grnId}`);
              if (res.ok) {
                const data = await res.json();
                return data;
              }
              return null;
            } catch {
              return null;
            }
          });
          
          const grnResults = await Promise.all(grnPromises);
          const map: Record<string, string> = {};
          grnResults.forEach((grn) => {
            if (grn && grn.id && grn.po_id) {
              map[grn.id] = grn.po_id;
            }
          });
          setGrnToPoMap(map);
        } catch (err) {
          console.error('Error fetching GRN mappings:', err);
          // Continue without GRN-to-PO mapping - PO numbers won't be clickable for GRN movements
        }
      }
    } catch (error) {
      console.error('Error fetching', error);
      const message = error instanceof Error ? error.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ingredientId) {
      fetchData();
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchData();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [ingredientId]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4" />;
      case 'out':
        return <TrendingDown className="w-4 h-4" />;
      case 'adjustment':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <span>•</span>;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'text-green-600';
      case 'out':
        return 'text-red-600';
      case 'adjustment':
        return 'text-blue-600';
      case 'wastage':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800';
      case 'out':
        return 'bg-red-100 text-red-800';
      case 'adjustment':
        return 'bg-blue-100 text-blue-800';
      case 'wastage':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const parseRemarks = (remarks: string | null) => {
    if (!remarks) return { text: '-', poNumber: null, grnNumber: null };
    
    const poMatch = remarks.match(/PO (PO-\d+)/);
    const grnMatch = remarks.match(/GRN (GRN-\d+)/);
    
    return {
      text: remarks,
      poNumber: poMatch ? poMatch[1] : null,
      grnNumber: grnMatch ? grnMatch[1] : null
    };
  };

  // Filter movements
  const filteredMovements = movements.filter((movement) => {
    const matchesType = filterType === 'all' || movement.movement_type === filterType;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const movDate = new Date(movement.movement_date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && movDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && movDate <= end;
      }
    }
    
    return matchesType && matchesDate;
  });

  if (loading) {
    return <Loading />;
  }

  if (error || !ingredient) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 mb-4">{error || 'Ingredient not found'}</p>
          <Link
            href="/stock"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Stock
          </Link>
        </div>
      </div>
    );
  }

  const currentStock = ingredient.stock_quantity || ingredient.current_stock || 0;

  // Calculate summary stats
  const totalIn = filteredMovements
    .filter((m) => m.movement_type === 'in')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const totalOut = filteredMovements
    .filter((m) => m.movement_type === 'out')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  // Adjustments can be positive (additions) or negative (reductions)
  const totalAdjustments = filteredMovements
    .filter((m) => m.movement_type === 'adjustment')
    .reduce((sum, m) => sum + m.quantity, 0);

  // Net change includes in, out, and adjustments
  const netChange = totalIn - totalOut + totalAdjustments;
  
  // Calculate opening and closing stock from movements
  let closingStock = currentStock;
  let openingStock = currentStock;
  
  // Check if we're filtering by date
  const isDateFiltered = startDate || endDate;
  
  if (filteredMovements.length > 0) {
    // Sort movements chronologically (oldest first)
    const sortedMovements = [...filteredMovements].sort((a, b) => {
      const dateA = new Date(a.movement_date).getTime();
      const dateB = new Date(b.movement_date).getTime();
      if (dateA !== dateB) return dateA - dateB; // Ascending by date
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // Then by created_at
    });
    
    // Opening stock = balance before the first movement in filtered set
    const firstMovement = sortedMovements[0];
    if (firstMovement && firstMovement.balance_after !== null && firstMovement.balance_after !== undefined) {
      // Reverse the effect of the first movement to get opening stock
      let balanceBefore = firstMovement.balance_after;
      if (firstMovement.movement_type === 'in') {
        balanceBefore -= Math.abs(firstMovement.quantity);
      } else if (firstMovement.movement_type === 'out') {
        balanceBefore += Math.abs(firstMovement.quantity);
      } else if (firstMovement.movement_type === 'adjustment') {
        balanceBefore -= firstMovement.quantity; // Reverse the adjustment
      }
      openingStock = balanceBefore;
    }
    
    // Closing stock depends on whether we're filtering by date
    if (isDateFiltered) {
      // For date-filtered view: closing stock = balance after last movement in filtered period
      const lastMovement = sortedMovements[sortedMovements.length - 1];
      if (lastMovement && lastMovement.balance_after !== null && lastMovement.balance_after !== undefined) {
        closingStock = lastMovement.balance_after;
      }
    } else {
      // For unfiltered view: closing stock = current stock (after all movements)
      closingStock = currentStock;
    }
  } else {
    // No filtered movements
    if (isDateFiltered) {
      // If date filtered but no movements, stock didn't change during period
      openingStock = currentStock;
      closingStock = currentStock;
    } else {
      // No movements at all, opening = closing = current
      openingStock = currentStock;
      closingStock = currentStock;
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/stock"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stock
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{ingredient.name}</h1>
              <p className="text-gray-600">Movement History</p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-sm text-gray-500 mb-1">Current Stock</div>
              <div className="text-3xl font-bold text-green-600">
                {currentStock.toFixed(2)} {ingredient.unit}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 font-medium mb-1">Opening Stock</div>
          <div className="text-2xl font-bold text-blue-800">
            {openingStock.toFixed(2)} {ingredient.unit}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium mb-1">Total In</div>
          <div className="text-2xl font-bold text-green-800">
            {totalIn.toFixed(2)} {ingredient.unit}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700 font-medium mb-1">Total Out</div>
          <div className="text-2xl font-bold text-red-800">
            {totalOut.toFixed(2)} {ingredient.unit}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-700 font-medium mb-1">Adjustments</div>
          <div className={`text-2xl font-bold ${totalAdjustments >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
            {totalAdjustments >= 0 ? '+' : ''}
            {totalAdjustments.toFixed(2)} {ingredient.unit}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700 font-medium mb-1">Net Change</div>
          <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netChange >= 0 ? '+' : ''}
            {netChange.toFixed(2)} {ingredient.unit}
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="text-sm text-indigo-700 font-medium mb-1">Closing Stock</div>
          <div className="text-2xl font-bold text-indigo-800">
            {closingStock.toFixed(2)} {ingredient.unit}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="in">In</option>
            <option value="out">Out</option>
            <option value="adjustment">Adjustment</option>
            <option value="wastage">Wastage</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setFilterType('all');
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance After
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No movements found
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const quantityDisplay =
                    movement.movement_type === 'in'
                      ? `+${Math.abs(movement.quantity)}`
                      : movement.movement_type === 'out'
                        ? `-${Math.abs(movement.quantity)}`
                        : movement.quantity > 0
                          ? `+${movement.quantity}`
                          : movement.quantity.toString();

                  return (
                    <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                        {formatDate(movement.movement_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getMovementBadgeColor(
                            movement.movement_type
                          )}`}
                        >
                          <span className={getMovementColor(movement.movement_type)}>
                            {getMovementIcon(movement.movement_type)}
                          </span>
                          <span className="capitalize">{movement.movement_type}</span>
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-right font-medium ${getMovementColor(
                          movement.movement_type
                        )}`}
                      >
                        {quantityDisplay} {ingredient.unit}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                        {movement.balance_after?.toFixed(2) || '-'} {ingredient.unit}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                        {movement.unit_cost
                          ? `₹${movement.unit_cost.toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {movement.reference_type === 'grn' ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Purchase
                          </span>
                        ) : movement.reference_type === 'adjustment' ? (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Adjustment
                          </span>
                        ) : movement.reference_type === 'wastage' ? (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            Wastage
                          </span>
                        ) : movement.reference_type ? (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {movement.reference_type}
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const parsed = parseRemarks(movement.remarks);
                          if (!parsed.poNumber && !parsed.grnNumber) {
                            return <span className="text-gray-600">{parsed.text}</span>;
                          }
                          
                          // Get PO ID - for GRN movements, fetch from GRN
                          let poId = movement.reference_id;
                          if (movement.reference_type === 'grn' && movement.reference_id) {
                            poId = grnToPoMap[movement.reference_id] || null;
                          }
                          
                          return (
                            <div className="flex gap-2 items-center flex-wrap">
                              <span className="text-gray-600">Purchase:</span>
                              {parsed.poNumber && poId ? (
                                <Link 
                                  href={`/purchase-orders/${poId}`}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  {parsed.poNumber}
                                </Link>
                              ) : parsed.poNumber ? (
                                <span className="text-gray-600 font-medium">{parsed.poNumber}</span>
                              ) : null}
                              {parsed.grnNumber && (
                                <span className="text-gray-500">({parsed.grnNumber})</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

