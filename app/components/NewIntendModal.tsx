'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { Ingredient } from '@/types';
import { Toast } from '@/app/components/Toast';
import { formatNumber } from '@/lib/formatNumber';

interface IngredientRow {
  id: string; // Temporary ID for React keys
  ingredient_id: string | null;
  ingredient_name: string;
  unit: string;
  last_price: number;
  current_stock: number;
  quantity: number | '';
  remarks: string;
}

interface NewIntendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewIntendModal({ isOpen, onClose, onSuccess }: NewIntendModalProps) {
  const [rows, setRows] = useState<IngredientRow[]>([
    {
      id: 'row-1',
      ingredient_id: null,
      ingredient_name: '',
      unit: '',
      last_price: 0,
      current_stock: 0,
      quantity: '',
      remarks: '',
    },
  ]);
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch all ingredients and stock data on mount
  useEffect(() => {
    if (isOpen) {
      fetchIngredients();
      fetchStockData();
    }
  }, [isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach((rowId) => {
        const ref = dropdownRefs.current[rowId];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns((prev) => ({ ...prev, [rowId]: false }));
        }
      });
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (!response.ok) {
        throw new Error('Failed to fetch ingredients');
      }
      const data = await response.json();
      setIngredients(data);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      showToast('Failed to load ingredients', 'error');
    }
  };

  const fetchStockData = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/stock?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      const data = await response.json();
      setStockData(data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      // Don't show toast for stock fetch failure, just log it
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearchChange = (rowId: string, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [rowId]: value }));
    
    // Filter ingredients after 2 characters
    if (value.length >= 2) {
      const filtered = ingredients.filter(
        (ing) =>
          ing.name.toLowerCase().includes(value.toLowerCase()) &&
          !rows.some((row) => row.ingredient_id === ing.id && row.id !== rowId)
      );
      setFilteredIngredients(filtered);
      setOpenDropdowns((prev) => ({ ...prev, [rowId]: true }));
      setFocusedRowId(rowId);
    } else {
      setOpenDropdowns((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  const handleIngredientSelect = (rowId: string, ingredient: Ingredient) => {
    // Find stock data for this ingredient
    const stockItem = stockData.find((item) => item.id === ingredient.id);
    const currentStock = stockItem 
      ? (stockItem.stock_quantity != null ? stockItem.stock_quantity : (stockItem.current_stock != null ? stockItem.current_stock : 0))
      : 0;

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ingredient_id: ingredient.id,
              ingredient_name: ingredient.name,
              unit: ingredient.unit,
              last_price: ingredient.last_price || 0,
              current_stock: currentStock,
            }
          : row
      )
    );
    setSearchTerms((prev) => ({ ...prev, [rowId]: ingredient.name }));
    setOpenDropdowns((prev) => ({ ...prev, [rowId]: false }));
    setFocusedRowId(null);
    // Clear error for this row
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${rowId}-ingredient`];
      return newErrors;
    });
  };

  const handleQuantityChange = (rowId: string, value: string) => {
    const numValue = value === '' ? '' : parseInt(value, 10) || 0;
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, quantity: numValue } : row
      )
    );
    // Clear error for this row
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${rowId}-quantity`];
      return newErrors;
    });
  };

  const handleRemarksChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, remarks: value } : row))
    );
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      showToast('At least one ingredient row is required', 'error');
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setSearchTerms((prev) => {
      const newTerms = { ...prev };
      delete newTerms[rowId];
      return newTerms;
    });
    setOpenDropdowns((prev) => {
      const newOpen = { ...prev };
      delete newOpen[rowId];
      return newOpen;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`${rowId}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  const handleAddRow = () => {
    const newRowId = `row-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        id: newRowId,
        ingredient_id: null,
        ingredient_name: '',
        unit: '',
        last_price: 0,
        current_stock: 0,
        quantity: '',
        remarks: '',
      },
    ]);
  };

  const validateRows = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    rows.forEach((row) => {
      if (!row.ingredient_id) {
        newErrors[`${row.id}-ingredient`] = 'Ingredient is required';
      }
      if (row.quantity === '' || row.quantity <= 0) {
        newErrors[`${row.id}-quantity`] = 'Quantity must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateRows()) {
      showToast('Please fix validation errors', 'error');
      return;
    }

    try {
      setCreating(true);

      // Prepare items array for API
      const items = rows
        .filter((row) => row.ingredient_id && row.quantity !== '' && row.quantity > 0)
        .map((row) => {
          const item: any = {
            ingredient_id: row.ingredient_id,
            quantity: typeof row.quantity === 'number' ? Math.round(row.quantity) : parseInt(row.quantity as string, 10) || 0,
          };

          // Include remarks if provided
          if (row.remarks && row.remarks.trim() !== '') {
            item.remarks = row.remarks.trim();
          }

          return item;
        });

      // Create the intend with items in a single request
      const createIntendResponse = await fetch('/api/intends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
        }),
      });

      if (!createIntendResponse.ok) {
        const errorData = await createIntendResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create intend');
      }

      const responseData = await createIntendResponse.json();

      showToast('Intend created successfully', 'success');
      
      // Reset form
      setRows([
        {
          id: 'row-1',
          ingredient_id: null,
          ingredient_name: '',
          unit: '',
          last_price: 0,
          current_stock: 0,
          quantity: '',
          remarks: '',
        },
      ]);
      setSearchTerms({});
      setErrors({});
      
      // Call success callback and close
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error creating intend:', error);
      const message = error instanceof Error ? error.message : 'Failed to create intend. Please try again.';
      showToast(message, 'error');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const validRowsCount = rows.filter(
    (row) => row.ingredient_id && row.quantity !== '' && row.quantity > 0
  ).length;
  const canCreate = validRowsCount >= 1 && !creating;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto my-8 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-bold text-gray-900">Create New Intend</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Column Headers (Desktop only) */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 mb-3 pb-2 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-600">Ingredient</div>
              <div className="text-sm font-medium text-gray-600">Unit</div>
              <div className="text-sm font-medium text-gray-600">Last Price / Stock</div>
              <div className="text-sm font-medium text-gray-600">Quantity</div>
              <div className="text-sm font-medium text-gray-600">Remarks</div>
            </div>

            {/* Ingredient Rows */}
            <div className="space-y-0 mb-6">
              {rows.map((row, index) => {
                const rowFilteredIngredients = searchTerms[row.id] && searchTerms[row.id].length >= 2
                  ? ingredients.filter(
                      (ing) =>
                        ing.name.toLowerCase().includes(searchTerms[row.id].toLowerCase()) &&
                        !rows.some((r) => r.ingredient_id === ing.id && r.id !== row.id)
                    )
                  : [];

                return (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start py-3 border-b last:border-0 border-gray-200">
                    {/* Ingredient Autocomplete */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1 md:hidden">
                        Ingredient <span className="text-red-500">*</span>
                      </label>
                      <div className="relative" ref={(el) => { dropdownRefs.current[row.id] = el; }}>
                        <input
                          ref={(el) => { inputRefs.current[row.id] = el; }}
                          type="text"
                          value={searchTerms[row.id] || row.ingredient_name || ''}
                          onChange={(e) => handleSearchChange(row.id, e.target.value)}
                          onFocus={() => {
                            if (searchTerms[row.id] && searchTerms[row.id].length >= 2) {
                              setOpenDropdowns((prev) => ({ ...prev, [row.id]: true }));
                            }
                          }}
                          className={`w-full h-10 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 ${
                            errors[`${row.id}-ingredient`] ? 'border-red-500' : ''
                          }`}
                          placeholder="Search ingredient..."
                        />
                        {openDropdowns[row.id] && rowFilteredIngredients.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {rowFilteredIngredients.map((ingredient) => (
                              <button
                                key={ingredient.id}
                                type="button"
                                onClick={() => handleIngredientSelect(row.id, ingredient)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900">
                                  {ingredient.name}
                                </div>
                                <div className="text-xs text-gray-500">{ingredient.unit}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {errors[`${row.id}-ingredient`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${row.id}-ingredient`]}</p>
                      )}
                    </div>

                    {/* Unit (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 md:hidden">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={row.unit}
                        readOnly
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                        placeholder="-"
                      />
                    </div>

                    {/* Latest Price and Current Stock (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 md:hidden">
                        Last Price / Stock
                      </label>
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={row.last_price > 0 ? `₹${formatNumber(row.last_price)}` : '-'}
                          readOnly
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                        />
                        {row.ingredient_id && (
                          <div className="text-xs text-gray-500 px-3 py-1 bg-gray-50 rounded border border-gray-200">
                            Stock: {formatNumber(row.current_stock)} {row.unit}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 md:hidden">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                        className={`w-full h-10 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 ${
                          errors[`${row.id}-quantity`] ? 'border-red-500' : ''
                        }`}
                        placeholder="0"
                      />
                      {errors[`${row.id}-quantity`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${row.id}-quantity`]}</p>
                      )}
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 md:hidden">
                        Remarks (Optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRemarksChange(row.id, e.target.value)}
                          className="flex-1 h-10 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                          placeholder="Optional remarks..."
                        />
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-2 text-red-600 hover:text-red-800 rounded transition-colors"
                            title="Remove ingredient"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Another Ingredient Button */}
            <button
              type="button"
              onClick={handleAddRow}
              className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Another Ingredient</span>
            </button>
          </div>

          {/* Bottom Section - Sticky */}
          <div className="border-t border-gray-200 bg-white p-6 sticky bottom-0">
            {/* Item Count */}
            <div className="mb-4 text-sm text-gray-600">
              Items: {rows.filter((row) => row.ingredient_id && row.quantity !== '' && row.quantity > 0).length}
            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Intend</span>
              </button>
            </div>
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

