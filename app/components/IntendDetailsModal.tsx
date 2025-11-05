'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Intend, IntendItem, Ingredient } from '@/types';
import GeneratePOModal from '@/app/components/GeneratePOModal';
import { usePermissions } from '@/lib/usePermissions';

interface IntendItemWithDetails extends IntendItem {
  ingredient: Ingredient | null;
  in_po?: boolean; // Flag: true if item is in PO (checked via po_items.intend_item_id)
  po_number?: string | null;
  po_status?: string | null;
  quantity_ordered?: number; // Actual quantity ordered in PO (if item is in PO)
  unit_price?: number; // Unit price for this item
}

interface IntendWithDetails extends Intend {
  vendor?: { id: string; name: string } | null;
  items?: IntendItemWithDetails[];
}

interface SelectedItem {
  intend_item_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  order_quantity: number;
  last_price: number;
}

interface IntendDetailsModalProps {
  intendId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IntendDetailsModal({
  intendId,
  isOpen,
  onClose,
  onSuccess,
}: IntendDetailsModalProps) {
  const [intend, setIntend] = useState<IntendWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isGeneratePOModalOpen, setIsGeneratePOModalOpen] = useState(false);
  const { canCreatePO } = usePermissions();

  useEffect(() => {
    if (isOpen && intendId) {
      fetchIntend();
    } else {
      // Reset state when modal closes
      setIntend(null);
      setError(null);
      setSelectedItems({});
      setOrderQuantities({});
      setIsGeneratePOModalOpen(false);
    }
  }, [isOpen, intendId]);

  const fetchIntend = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      console.log('Fetching intend:', intendId);
      const url = `/api/intends/${intendId}`;
      console.log('Fetch URL:', url);
      
      let response: Response;
      try {
        response = await fetch(url);
      } catch (fetchError) {
        // Network error or fetch failed
        console.error('Network error:', fetchError);
        const networkError = fetchError instanceof Error 
          ? fetchError.message 
          : 'Network error - check if server is running';
        throw new Error(`Failed to connect: ${networkError}`);
      }
      
      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
            console.error('API Error (JSON):', errorData);
          } catch {
            // Not JSON, use text as error message
            if (errorText) {
              errorMessage = errorText.length > 200 ? `${errorText.substring(0, 200)}...` : errorText;
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `${errorMessage} (Could not parse error response)`;
        }
        throw new Error(errorMessage);
      }
      
      let data: any;
      try {
        const responseText = await response.text();
        console.log('Response text length:', responseText.length);
        console.log('Response text preview:', responseText.substring(0, 500));
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        
        data = JSON.parse(responseText);
        console.log('Fetched intend data:', data);
        console.log('Items:', data.items);
      } catch (parseError) {
        console.error('Error parsing response JSON:', parseError);
        throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      // Transform items to match component expectations if needed
      if (data.items) {
        console.log('Setting items to state:', data.items);
        
        // Transform items to match IntendItemWithDetails structure
        const transformedItems = data.items.map((item: any) => {
          // If API returns flat structure (ingredient_name, unit, last_price), create ingredient object
          const transformedItem: IntendItemWithDetails = {
            ...item,
            ingredient: item.ingredient || (item.ingredient_name ? {
              id: item.ingredient_id,
              name: item.ingredient_name,
              unit: item.unit,
              last_price: item.last_price || 0,
            } : null),
          };
          console.log('Transformed item:', transformedItem);
          return transformedItem;
        });

        // Set intend with transformed items
        setIntend({
          ...data,
          items: transformedItems,
        });

        // Initialize order quantities with original quantities
        const initialQuantities: Record<string, number> = {};
        transformedItems.forEach((item: IntendItemWithDetails) => {
          if (!item.in_po) {
            initialQuantities[item.id] = item.quantity;
          }
        });
        setOrderQuantities(initialQuantities);
      } else {
        setIntend(data);
      }
    } catch (error) {
      console.error('Error fetching intend - Full error:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message || 'Failed to fetch intend details';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = `Failed to fetch intend details: ${JSON.stringify(error)}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (itemId: string, item: IntendItemWithDetails) => {
    if (item.in_po) {
      // Can't select items already in PO
      return;
    }

    const isSelected = !!selectedItems[itemId];

    if (isSelected) {
      // Deselect
      const newSelectedItems = { ...selectedItems };
      delete newSelectedItems[itemId];
      setSelectedItems(newSelectedItems);
    } else {
      // Select
      // Handle both nested ingredient object or flat structure
      const ingredientName = item.ingredient?.name || (item as any).ingredient_name || '';
      const ingredientUnit = item.ingredient?.unit || (item as any).unit || '';
      const ingredientLastPrice = item.ingredient?.last_price || (item as any).last_price || 0;

      if (ingredientName) {
        console.log('Selecting item:', { itemId, item, ingredientName, ingredientUnit, ingredientLastPrice });
        setSelectedItems({
          ...selectedItems,
          [itemId]: {
            intend_item_id: item.id,
            ingredient_id: item.ingredient_id,
            ingredient_name: ingredientName,
            unit: ingredientUnit,
            order_quantity: orderQuantities[itemId] || item.quantity,
            last_price: ingredientLastPrice,
          },
        });
      } else {
        console.warn('Cannot select item - missing ingredient data:', item);
      }
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setOrderQuantities((prev) => ({
      ...prev,
      [itemId]: quantity
    }));

    // Update selected item if it's selected
    if (selectedItems[itemId]) {
      setSelectedItems((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          order_quantity: quantity,
        },
      }));
    }
  };

  const handleSelect = (item: IntendItemWithDetails, checked: boolean) => {
    handleCheckboxChange(item.id, item);
  };

  const handleGeneratePO = () => {
    setIsGeneratePOModalOpen(true);
  };

  const handlePOGenerated = (poNumber: string) => {
    setIsGeneratePOModalOpen(false);
    // Refresh intend data to show updated PO status
    fetchIntend();
    // Reset selections
    setSelectedItems({});
    // Call success callback to refresh intends list
    onSuccess();
    // Show success message or close modal
    onClose();
  };

  const getStatusBadgeClass = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  const selectedItemsArray = Object.values(selectedItems);
  const canGeneratePO = selectedItemsArray.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-4">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 font-mono">
                      {intend?.name || 'Loading...'}
                    </h2>
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
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <p className="font-semibold">Error loading intend details</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      fetchIntend();
                    }}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : intend ? (
              <>
                {/* Vendor Info */}
                {intend.vendor && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <p className="text-base text-gray-900">{intend.vendor.name}</p>
                  </div>
                )}

                {/* Ingredients Table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
                  {intend.items && intend.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            {canCreatePO && (
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Select
                              </th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Ingredient
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Unit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Intend Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Order Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Unit Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {intend.items.map((item, index) => {
                            console.log('Rendering item:', item);
                            const isInPO = item.in_po || !!item.po_number;
                            const isSelected = !!selectedItems[item.id];

                            return (
                              <tr
                                key={item.id || index}
                                className={isInPO ? 'bg-gray-50' : 'hover:bg-gray-50'}
                              >
                                {/* Select column */}
                                {canCreatePO && (
                                  <td className="px-4 py-3">
                                    {!isInPO ? (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => handleSelect(item, e.target.checked)}
                                        className="rounded border-gray-300"
                                      />
                                    ) : (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                                        In PO: {item.po_number || 'N/A'}
                                      </span>
                                    )}
                                  </td>
                                )}

                                {/* Ingredient name */}
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {item.ingredient?.name || (item as any).ingredient_name || '-'}
                                </td>

                                {/* Unit */}
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {item.ingredient?.unit || (item as any).unit || '-'}
                                </td>

                                {/* Intend Qty - ALWAYS show original quantity */}
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {item.quantity}
                                </td>

                                {/* Order Qty - Show actual PO qty OR editable input */}
                                <td className="px-4 py-3">
                                  {isInPO ? (
                                    // Item already in PO - show actual ordered quantity (read-only)
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-green-600">
                                        {item.quantity_ordered || item.quantity}
                                      </span>
                                      {/* Show difference if quantities don't match */}
                                      {item.quantity_ordered && item.quantity_ordered !== item.quantity && (
                                        <span className="text-xs text-amber-600">
                                          (±{item.quantity_ordered - item.quantity})
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    // Item not in PO - show editable input
                                    <input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      value={orderQuantities[item.id] || item.quantity}
                                      onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                                      disabled={!isSelected}
                                      className={`border border-gray-300 rounded px-2 py-1 w-24 text-sm ${
                                        isSelected
                                          ? 'bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                      }`}
                                    />
                                  )}
                                </td>

                                {/* Unit Price */}
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  ₹{((item as any).unit_price || item.ingredient?.last_price || 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No ingredients added yet.</p>
                  )}
                </div>

                {/* Bottom Section */}
                {canCreatePO && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Selected: {selectedItemsArray.length} {selectedItemsArray.length === 1 ? 'item' : 'items'}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={handleGeneratePO}
                          disabled={!canGeneratePO}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Generate PO
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!canCreatePO && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Failed to load intend details.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate PO Modal */}
      <GeneratePOModal
        selectedItems={selectedItemsArray}
        intendId={intendId}
        isOpen={isGeneratePOModalOpen}
        onClose={() => setIsGeneratePOModalOpen(false)}
        onSuccess={handlePOGenerated}
      />
    </>
  );
}
