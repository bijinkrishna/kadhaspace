'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Ingredient } from '@/types';

interface StockAdjustmentModalProps {
  ingredient?: Ingredient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AdjustmentItem {
  ingredient_id: string;
  ingredient_name: string;
  system_quantity: number;
  actual_quantity: number;
  remarks: string;
}

export function StockAdjustmentModal({
  ingredient,
  isOpen,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState('physical_count');
  const [adjustmentDate, setAdjustmentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newQuantity, setNewQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multiple items mode state
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [selectedItems, setSelectedItems] = useState<AdjustmentItem[]>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        // Single item mode
        setIsMultipleMode(false);
        const stockQty = (ingredient as any).stock_quantity || ingredient.current_stock || 0;
        setNewQuantity(stockQty);
        setRemarks('');
        setNotes('');
      } else {
        // Multiple items mode - fetch all ingredients
        setIsMultipleMode(true);
        fetchAllIngredients();
      }
      setAdjustmentDate(new Date().toISOString().split('T')[0]);
      setAdjustmentType('physical_count');
      setError(null);
    } else {
      // Reset state when modal closes
      setNewQuantity(0);
      setRemarks('');
      setNotes('');
      setSelectedItems([]);
      setError(null);
    }
  }, [isOpen, ingredient]);

  const fetchAllIngredients = async () => {
    try {
      const response = await fetch('/api/stock');
      if (response.ok) {
        const data = await response.json();
        setAllIngredients(data);
        // Initialize selected items with current stock
        setSelectedItems(
          data.map((ing: any) => ({
            ingredient_id: ing.id,
            ingredient_name: ing.name,
            system_quantity: ing.stock_quantity || ing.current_stock || 0,
            actual_quantity: ing.stock_quantity || ing.current_stock || 0,
            remarks: '',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const handleItemQuantityChange = (ingredientId: string, value: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.ingredient_id === ingredientId
          ? { ...item, actual_quantity: value >= 0 ? value : 0 }
          : item
      )
    );
  };

  const handleItemRemarksChange = (ingredientId: string, value: string) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.ingredient_id === ingredientId ? { ...item, remarks: value } : item
      )
    );
  };

  const calculateVariance = (systemQty: number, actualQty: number): number => {
    return actualQty - systemQty;
  };

  const getVarianceColor = (variance: number): string => {
    if (variance === 0) return 'text-gray-600';
    if (variance > 0) return 'text-green-600';
    return 'text-red-600';
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      let items: AdjustmentItem[] = [];

      if (isMultipleMode) {
        // Multiple items mode - only include items with changes
        items = selectedItems
          .filter(
            (item) => item.actual_quantity !== item.system_quantity || item.remarks.trim() !== ''
          )
          .map((item) => ({
            ingredient_id: item.ingredient_id,
            ingredient_name: item.ingredient_name,
            system_quantity: item.system_quantity,
            actual_quantity: item.actual_quantity,
            remarks: item.remarks,
          }));
      } else {
        // Single item mode
        if (!ingredient) {
          setError('Ingredient is required');
          setLoading(false);
          return;
        }
        items = [
          {
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            system_quantity: (ingredient as any).stock_quantity || ingredient.current_stock || 0,
            actual_quantity: newQuantity,
            remarks: remarks,
          },
        ];
      }

      if (items.length === 0) {
        setError('No adjustments to submit');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment_type: adjustmentType,
          adjustment_date: adjustmentDate,
          notes: notes || null,
          items: items,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to adjust stock');
      }

      const data = await response.json();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      const message = error instanceof Error ? error.message : 'Error adjusting stock';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const variance = ingredient
    ? newQuantity - ((ingredient as any).stock_quantity || ingredient.current_stock || 0)
    : 0;
  const currentStock = ingredient
    ? (ingredient as any).stock_quantity || ingredient.current_stock || 0
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {ingredient ? `Adjust Stock - ${ingredient.name}` : 'Physical Stock Count'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Type
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="physical_count">Physical Count</option>
                <option value="wastage">Wastage</option>
                <option value="loss">Loss</option>
                <option value="found">Found</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Date
              </label>
              <input
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Single Item Mode */}
          {!isMultipleMode && ingredient && (
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stock
                    </label>
                    <div className="text-lg font-semibold text-gray-900">{currentStock}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variance
                    </label>
                    <div className={`text-lg font-semibold ${getVarianceColor(variance)}`}>
                      {variance > 0 ? '+' : ''}
                      {variance}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Reason for adjustment (optional)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Multiple Items Mode */}
          {isMultipleMode && (
            <div className="mb-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Update quantities for items that need adjustment. Items with no changes will be
                  skipped.
                </p>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingredient
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        System Qty
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Actual Qty
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Variance
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItems.map((item) => {
                      const itemVariance = calculateVariance(item.system_quantity, item.actual_quantity);
                      const hasChange = itemVariance !== 0 || item.remarks.trim() !== '';

                      return (
                        <tr
                          key={item.ingredient_id}
                          className={hasChange ? 'bg-blue-50' : ''}
                        >
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {item.ingredient_name}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {item.system_quantity}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.actual_quantity}
                              onChange={(e) =>
                                handleItemQuantityChange(
                                  item.ingredient_id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${getVarianceColor(itemVariance)}`}>
                            {itemVariance > 0 ? '+' : ''}
                            {itemVariance}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={(e) =>
                                handleItemRemarksChange(item.ingredient_id, e.target.value)
                              }
                              placeholder="Notes"
                              className="w-32 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Overall Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this adjustment"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Processing...' : 'Submit Adjustment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






