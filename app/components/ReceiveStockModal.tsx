'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { POItem, PurchaseOrder } from '@/types';

interface POWithItems extends PurchaseOrder {
  items?: Array<POItem & { ingredient_name: string; unit: string }>;
}

interface ReceiveStockModalProps {
  poId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveStockModal({
  poId,
  isOpen,
  onClose,
  onSuccess,
}: ReceiveStockModalProps) {
  const [po, setPO] = useState<POWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [actualPrices, setActualPrices] = useState<Record<string, number>>({});
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && poId) {
      fetchPODetails();
    } else {
      // Reset state when modal closes
      setPO(null);
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setReceivedBy('');
      setNotes('');
      setReceivedQuantities({});
      setActualPrices({});
      setItemRemarks({});
    }
  }, [isOpen, poId]);

  const fetchPODetails = async () => {
    try {
      setFetching(true);
      const response = await fetch(`/api/purchase-orders/${poId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch purchase order details');
      }
      const data = await response.json();
      setPO(data);

      // Initialize with 0 quantities and PO prices (user will enter what they're receiving now)
      const initialQuantities: Record<string, number> = {};
      const initialPrices: Record<string, number> = {};
      data.items?.forEach((item: POItem) => {
        initialQuantities[item.id] = 0; // Start with 0 for this GRN
        initialPrices[item.id] = item.unit_price;
      });
      setReceivedQuantities(initialQuantities);
      setActualPrices(initialPrices);
    } catch (error) {
      console.error('Error fetching PO details:', error);
      alert('Failed to load purchase order details');
    } finally {
      setFetching(false);
    }
  };

  const calculateQtyVariance = (itemId: string): number => {
    const item = po?.items?.find((i) => i.id === itemId);
    const previouslyReceived = item?.quantity_received || 0;
    const receivingNow = receivedQuantities[itemId] || 0;
    const totalReceived = previouslyReceived + receivingNow;
    const ordered = item?.quantity_ordered || 0;
    return totalReceived - ordered; // Total variance, not just this GRN
  };

  const calculatePriceVariance = (itemId: string): number => {
    const actual = actualPrices[itemId] || 0;
    const ordered = po?.items?.find((i) => i.id === itemId)?.unit_price || 0;
    return actual - ordered;
  };

  const calculatePriceVariancePercent = (itemId: string): number => {
    const ordered = po?.items?.find((i) => i.id === itemId)?.unit_price || 0;
    if (ordered === 0) return 0;
    const variance = calculatePriceVariance(itemId);
    return Math.abs((variance / ordered) * 100);
  };

  const calculateLineTotal = (itemId: string): number => {
    const qty = receivedQuantities[itemId] || 0;
    const price = actualPrices[itemId] || 0;
    return qty * price;
  };

  const getQtyVarianceColor = (variance: number): string => {
    if (variance === 0) return 'text-green-600';
    if (Math.abs(variance) <= 2) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPriceVarianceColor = (itemId: string): string => {
    const variance = calculatePriceVariance(itemId);
    if (variance === 0) return 'text-green-600';
    const percent = calculatePriceVariancePercent(itemId);
    if (percent <= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleReceiveStock = async () => {
    if (!po) return;

    setLoading(true);
    const items = po.items?.map((item) => {
      const receivedQty = receivedQuantities[item.id] || 0;
      const actualPrice = actualPrices[item.id] || 0;
      const qtyVariance = calculateQtyVariance(item.id);
      const priceVariance = calculatePriceVariance(item.id);
      const totalAmount = calculateLineTotal(item.id);

      return {
        po_item_id: item.id,
        ingredient_id: item.ingredient_id,
        quantity_ordered: item.quantity_ordered,
        quantity_received: receivedQty,
        variance: qtyVariance,
        unit_price_ordered: item.unit_price,
        unit_price_actual: actualPrice,
        price_variance: priceVariance,
        total_amount: totalAmount,
        remarks: itemRemarks[item.id] || null,
      };
    }) || [];

    try {
      const response = await fetch('/api/grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: poId,
          received_date: receivedDate,
          received_by: receivedBy || null,
          notes: notes || null,
          items: items,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to receive stock');
      }

      const data = await response.json();
      alert(`Stock received successfully! GRN: ${data.grn_number}`);
      onSuccess();
    } catch (error) {
      console.error('Error receiving stock:', error);
      const message = error instanceof Error ? error.message : 'Error receiving stock';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const grandTotal =
    po?.items?.reduce((sum, item) => sum + calculateLineTotal(item.id), 0) || 0;

  const itemsWithQtyVariance =
    po?.items?.filter((item) => {
      const variance = calculateQtyVariance(item.id);
      return variance !== 0;
    }).length || 0;

  const itemsWithPriceVariance =
    po?.items?.filter((item) => {
      const variance = calculatePriceVariance(item.id);
      return variance !== 0;
    }).length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">Receive Stock - {po?.po_number || 'Loading...'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !po ? (
            <div className="text-center py-12 text-gray-500">
              <p>Failed to load purchase order details</p>
            </div>
          ) : (
            <>
              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Name (optional)"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingredient
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Ordered
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Previously Received
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Receiving Now
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Total Received
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Qty Variance
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        PO Price
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Actual Price
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Price Var
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {po.items && po.items.length > 0 ? (
                      po.items.map((item) => {
                        const previouslyReceived = item.quantity_received || 0;
                        const receivingNow = receivedQuantities[item.id] || 0;
                        const totalReceived = previouslyReceived + receivingNow;
                        const qtyVar = calculateQtyVariance(item.id);
                        const priceVar = calculatePriceVariance(item.id);
                        const lineTotal = calculateLineTotal(item.id);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {item.ingredient_name || 'Unknown'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{item.unit}</td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              {item.quantity_ordered}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {previouslyReceived}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={receivingNow}
                                onChange={(e) =>
                                  setReceivedQuantities({
                                    ...receivedQuantities,
                                    [item.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {totalReceived}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-medium ${getQtyVarianceColor(
                                qtyVar
                              )}`}
                            >
                              {qtyVar > 0 ? '+' : ''}
                              {qtyVar}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              ₹{item.unit_price?.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={actualPrices[item.id] || 0}
                                onChange={(e) =>
                                  setActualPrices({
                                    ...actualPrices,
                                    [item.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-medium ${getPriceVarianceColor(
                                item.id
                              )}`}
                            >
                              {priceVar > 0 ? '+' : ''}₹{priceVar.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={itemRemarks[item.id] || ''}
                                onChange={(e) =>
                                  setItemRemarks({
                                    ...itemRemarks,
                                    [item.id]: e.target.value,
                                  })
                                }
                                placeholder="Notes"
                                className="w-32 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="px-3 py-8 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Total Items:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {po.items?.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Qty Variance:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {itemsWithQtyVariance} items
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Price Variance:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {itemsWithPriceVariance} items
                    </span>
                  </div>
                  <div className="text-right md:col-start-4">
                    <span className="text-sm text-gray-600">Grand Total:</span>
                    <span className="ml-2 text-xl font-bold text-gray-900">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes (optional)"
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveStock}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Processing...' : 'Receive Stock'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

