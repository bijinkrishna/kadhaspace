'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Edit, Trash2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Intend, Ingredient, IntendItem } from '@/types';
import { Toast } from '@/app/components/Toast';
import { ConfirmationDialog } from '@/app/components/ConfirmationDialog';

interface IntendWithVendor extends Intend {
  vendor?: {
    id: string;
    name: string;
  } | null;
}

interface IntendItemWithIngredient extends IntendItem {
  ingredient: Ingredient;
}

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => Promise<void>;
  initialQuantity: number;
  ingredientName: string;
  isLoading: boolean;
}

function EditItemModal({
  isOpen,
  onClose,
  onSubmit,
  initialQuantity,
  ingredientName,
  isLoading,
}: EditItemModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    if (isOpen) {
      setQuantity(initialQuantity);
    }
  }, [isOpen, initialQuantity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      return;
    }
    await onSubmit(quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Quantity - {ingredientName}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              required
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            {quantity <= 0 && (
              <p className="mt-1 text-sm text-red-600">
                Quantity must be greater than 0
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || quantity <= 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IntendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [intendId, setIntendId] = useState<string>('');
  const [intend, setIntend] = useState<IntendWithVendor | null>(null);
  const [items, setItems] = useState<IntendItemWithIngredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    vendor_id: '',
    status: 'draft' as Intend['status'],
    notes: '',
  });
  const [intendName, setIntendName] = useState('');

  // Add item form
  const [newItem, setNewItem] = useState({
    ingredient_id: '',
    quantity: '',
  });
  const [addingItem, setAddingItem] = useState(false);

  // Edit item modal
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    item: IntendItemWithIngredient | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [updatingItem, setUpdatingItem] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    item: IntendItemWithIngredient | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [deletingItem, setDeletingItem] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setIntendId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (intendId) {
      fetchIntend();
      fetchIngredients();
      fetchVendors();
    }
  }, [intendId]);

  const fetchIntend = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/intends/${intendId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/intends');
          return;
        }
        throw new Error('Failed to fetch intend');
      }
      const data = await response.json();
      setIntend(data);
      setItems(data.items || []);
      setIntendName(data.name || '');
      setFormData({
        vendor_id: data.vendor_id || '',
        status: data.status || 'draft',
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Error fetching intend:', error);
      showToast('Failed to load intend', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })));
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/intends/${intendId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_id: formData.vendor_id || null,
          status: formData.status,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update intend');
      }

      showToast('Intend updated successfully', 'success');
      fetchIntend();
    } catch (error) {
      console.error('Error updating intend:', error);
      const message = error instanceof Error ? error.message : 'Failed to update intend';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.ingredient_id || !newItem.quantity || parseFloat(newItem.quantity) <= 0) {
      showToast('Please select an ingredient and enter a valid quantity', 'error');
      return;
    }

    try {
      setAddingItem(true);
      const response = await fetch(`/api/intends/${intendId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredient_id: newItem.ingredient_id,
          quantity: parseFloat(newItem.quantity),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item');
      }

      showToast('Item added successfully', 'success');
      setNewItem({ ingredient_id: '', quantity: '' });
      fetchIntend();
    } catch (error) {
      console.error('Error adding item:', error);
      const message = error instanceof Error ? error.message : 'Failed to add item';
      showToast(message, 'error');
    } finally {
      setAddingItem(false);
    }
  };

  const handleEditItem = async (quantity: number) => {
    if (!editModal.item) return;

    try {
      setUpdatingItem(true);
      const response = await fetch(`/api/intends/${intendId}/items/${editModal.item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update item');
      }

      showToast('Item updated successfully', 'success');
      setEditModal({ isOpen: false, item: null });
      fetchIntend();
    } catch (error) {
      console.error('Error updating item:', error);
      const message = error instanceof Error ? error.message : 'Failed to update item';
      showToast(message, 'error');
    } finally {
      setUpdatingItem(false);
    }
  };

  const handleDeleteClick = (item: IntendItemWithIngredient) => {
    setDeleteDialog({ isOpen: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return;

    try {
      setDeletingItem(true);
      const response = await fetch(`/api/intends/${intendId}/items/${deleteDialog.item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete item');
      }

      showToast('Item deleted successfully', 'success');
      setDeleteDialog({ isOpen: false, item: null });
      fetchIntend();
    } catch (error) {
      console.error('Error deleting item:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete item';
      showToast(message, 'error');
    } finally {
      setDeletingItem(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!intend) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/intends"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Intends</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Intend ID Display */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Intend ID: {intendName || 'Loading...'}
            </h1>
          </div>

          <div className="space-y-4">

            <div>
              <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                id="vendor_id"
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select a vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Intend['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 resize-none"
                placeholder="Optional notes..."
              />
            </div>

            <div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Items</h2>
            <div className="text-sm text-gray-600">
              Total: {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>

          <form onSubmit={handleAddItem} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ingredient" className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredient <span className="text-red-500">*</span>
                </label>
                <select
                  id="ingredient"
                  value={newItem.ingredient_id}
                  onChange={(e) => setNewItem({ ...newItem, ingredient_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  required
                >
                  <option value="">Select ingredient</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingItem || !newItem.ingredient_id || !newItem.quantity}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {addingItem && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </form>

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items added yet. Add your first item above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingredient Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.ingredient?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.ingredient?.unit || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.quantity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditModal({ isOpen: true, item })}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            aria-label="Edit item"
                            title="Edit quantity"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            aria-label="Delete item"
                            title="Delete item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <EditItemModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, item: null })}
        onSubmit={handleEditItem}
        initialQuantity={editModal.item?.quantity || 0}
        ingredientName={editModal.item?.ingredient?.name || ''}
        isLoading={updatingItem}
      />

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.item?.ingredient?.name}" from this intend?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, item: null })}
        isLoading={deletingItem}
      />
    </>
  );
}
