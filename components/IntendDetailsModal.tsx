'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Package } from 'lucide-react';
import { Intend, IntendItem, Ingredient } from '@/types';

interface IntendWithItems extends Intend {
  vendor?: {
    id: string;
    name: string;
  } | null;
  items?: Array<IntendItem & { ingredient: Ingredient | null }>;
}

interface IntendDetailsModalProps {
  intendId: string;
  isOpen: boolean;
  onClose: () => void;
  onGeneratePO: (selectedItems: Array<{ intendItemId: string; orderQuantity: number }>) => void;
}

interface ItemSelection {
  selected: boolean;
  orderQuantity: number;
}

export default function IntendDetailsModal({
  intendId,
  isOpen,
  onClose,
  onGeneratePO,
}: IntendDetailsModalProps) {
  const [intend, setIntend] = useState<IntendWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [itemSelections, setItemSelections] = useState<Record<string, ItemSelection>>({});
  const [generatePOModalOpen, setGeneratePOModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && intendId) {
      fetchIntend();
    } else {
      setIntend(null);
      setItemSelections({});
    }
  }, [isOpen, intendId]);

  const fetchIntend = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/intends/${intendId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch intend');
      }
      const data = await response.json();
      setIntend(data);

      // Initialize selections with all items unchecked
      const selections: Record<string, ItemSelection> = {};
      (data.items || []).forEach((item: IntendItem) => {
        selections[item.id] = {
          selected: false,
          orderQuantity: item.quantity,
        };
      });
      setItemSelections(selections);
    } catch (error) {
      console.error('Error fetching intend:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setItemSelections((prev) => {
      const item = intend?.items?.find((i) => i.id === itemId);
      if (!item) return prev;

      return {
        ...prev,
        [itemId]: {
          selected: checked,
          orderQuantity: checked ? item.quantity : prev[itemId]?.orderQuantity || item.quantity,
        },
      };
    });
  };

  const handleOrderQuantityChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setItemSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        orderQuantity: numValue,
      },
    }));
  };

  const handleGeneratePOClick = () => {
    const selectedItems = Object.entries(itemSelections)
      .filter(([_, selection]) => selection.selected)
      .map(([itemId, selection]) => ({
        intendItemId: itemId,
        orderQuantity: selection.orderQuantity,
      }));

    if (selectedItems.length > 0) {
      setGeneratePOModalOpen(true);
    }
  };

  const handleGeneratePOConfirm = () => {
    const selectedItems = Object.entries(itemSelections)
      .filter(([_, selection]) => selection.selected)
      .map(([itemId, selection]) => ({
        intendItemId: itemId,
        orderQuantity: selection.orderQuantity,
      }));

    if (selectedItems.length > 0) {
      onGeneratePO(selectedItems);
      setGeneratePOModalOpen(false);
    }
  };

  const selectedCount = Object.values(itemSelections).filter((s) => s.selected).length;

  const getStatusBadgeClass = (status: Intend['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partially_fulfilled':
        return 'bg-amber-100 text-amber-800';
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Intend['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'partially_fulfilled':
        return 'Partially Fulfilled';
      case 'fulfilled':
        return 'Fulfilled';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-mono">{intend?.name || 'Loading...'}</h2>
              </div>
              {intend && (
                <span
                  className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(
                    intend.status
                  )}`}
                >
                  {getStatusLabel(intend.status)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : intend && intend.items ? (
              <div className="space-y-4">
                {/* Ingredients Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={selectedCount === intend.items!.length && intend.items!.length > 0}
                            onChange={(e) => {
                              intend.items!.forEach((item) => {
                                handleCheckboxChange(item.id, e.target.checked);
                              });
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ingredient Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Original Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {intend.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            No items added to this intend.
                          </td>
                        </tr>
                      ) : (
                        intend.items.map((item) => {
                          const selection = itemSelections[item.id] || {
                            selected: false,
                            orderQuantity: item.quantity,
                          };

                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selection.selected}
                                  onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {item.ingredient?.name || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {item.ingredient?.unit || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={selection.orderQuantity}
                                  onChange={(e) => handleOrderQuantityChange(item.id, e.target.value)}
                                  disabled={!selection.selected}
                                  className={`w-24 px-2 py-1 text-sm border rounded text-right ${
                                    selection.selected
                                      ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500'
                                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Section */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Selected: <span className="font-semibold text-gray-900">{selectedCount}</span> {selectedCount === 1 ? 'item' : 'items'}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleGeneratePOClick}
                      disabled={selectedCount === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Generate PO
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Failed to load intend details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate PO Confirmation Modal */}
      {generatePOModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Generate Purchase Order</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Generate a purchase order with {selectedCount} selected {selectedCount === 1 ? 'item' : 'items'}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratePOModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePOConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}






