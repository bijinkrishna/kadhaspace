'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Package } from 'lucide-react';

interface SelectedItem {
  intend_item_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  order_quantity: number;
  last_price: number;
}

interface Vendor {
  id: string;
  name: string;
}

interface GeneratePOModalProps {
  selectedItems: SelectedItem[];
  intendId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (poNumber: string) => void;
}

export default function GeneratePOModal({
  selectedItems,
  intendId,
  isOpen,
  onClose,
  onSuccess,
}: GeneratePOModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    vendor_id: '',
    expected_delivery_date: '',
    notes: '',
  });

  // Initialize unit prices when modal opens or selectedItems change
  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      const initialPrices: Record<string, number> = {};
      selectedItems.forEach((item) => {
        initialPrices[item.intend_item_id] = item.last_price;
      });
      setUnitPrices(initialPrices);
    }
  }, [isOpen, selectedItems]);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      // Reset form when modal opens
      setFormData({
        vendor_id: '',
        expected_delivery_date: '',
        notes: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await fetch('/api/vendors');
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleUnitPriceChange = (intendItemId: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setUnitPrices((prev) => ({
      ...prev,
      [intendItemId]: numValue >= 0 ? numValue : 0,
    }));
  };

  const calculateItemTotal = (item: SelectedItem) => {
    const unitPrice = unitPrices[item.intend_item_id] ?? item.last_price;
    return item.order_quantity * unitPrice;
  };

  const calculateGrandTotal = () => {
    return selectedItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      setError('Please select a vendor');
      return;
    }

    // Validate all unit prices are valid
    const invalidPrices = selectedItems.some((item) => {
      const price = unitPrices[item.intend_item_id] ?? item.last_price;
      return isNaN(price) || price < 0;
    });

    if (invalidPrices) {
      setError('Please enter valid unit prices for all items');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Prepare items array with current unit prices
      const items = selectedItems.map((item) => ({
        intend_item_id: item.intend_item_id,
        ingredient_id: item.ingredient_id,
        quantity: item.order_quantity,
        unit_price: unitPrices[item.intend_item_id] ?? item.last_price,
      }));

      // Call the generate-from-intend API
      const response = await fetch('/api/purchase-orders/generate-from-intend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intend_id: intendId,
          vendor_id: formData.vendor_id,
          items: items,
          expected_delivery_date: formData.expected_delivery_date || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Failed to create purchase order');
      }

      const data = await response.json();
      const poNumber = data.purchase_order?.po_number || data.po_number || 'PO';

      // Show success message
      // Call success callback with PO number
      onSuccess(poNumber);

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating PO:', error);
      const message = error instanceof Error ? error.message : 'Failed to create purchase order. Please try again.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const grandTotal = calculateGrandTotal();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Generate Purchase Order
          </h2>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Selected Items Table */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ingredient
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedItems.map((item) => {
                      const currentUnitPrice = unitPrices[item.intend_item_id] ?? item.last_price;
                      const itemTotal = calculateItemTotal(item);

                      return (
                        <tr key={item.intend_item_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.ingredient_name}
                            </div>
                            <div className="text-xs text-gray-500">{item.unit}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-gray-900">{item.order_quantity}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={currentUnitPrice}
                              onChange={(e) => handleUnitPriceChange(item.intend_item_id, e.target.value)}
                              disabled={isGenerating}
                              className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(itemTotal)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor <span className="text-red-500">*</span>
                </label>
                {loadingVendors ? (
                  <div className="py-2.5 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading vendors...</span>
                  </div>
                ) : (
                  <select
                    id="vendor_id"
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    required
                    disabled={isGenerating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:opacity-50"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                )}
                {!formData.vendor_id && !loadingVendors && (
                  <p className="mt-1 text-xs text-red-600">Vendor is required</p>
                )}
              </div>

              <div>
                <label htmlFor="expected_delivery_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  id="expected_delivery_date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 resize-none disabled:opacity-50"
                  placeholder="Optional notes for the purchase order"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Total Items:</span>
                <span className="text-sm font-semibold text-gray-900">{selectedItems.length}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="text-base font-semibold text-gray-900">Grand Total:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !formData.vendor_id}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
              <Package className="w-4 h-4" />
              Generate PO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
