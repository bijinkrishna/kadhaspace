'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Ingredient } from '@/types';
import { Toast } from '@/app/components/Toast';
import { Loading } from '@/app/components/Loading';
import { ConfirmationDialog } from '@/app/components/ConfirmationDialog';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface IngredientFormData {
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IngredientFormData) => Promise<void>;
  initialData?: Ingredient | null;
  isLoading: boolean;
}

function IngredientModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: ModalProps) {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    unit: 'kg',
    current_stock: 0,
    min_stock: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        unit: initialData.unit,
        current_stock: initialData.current_stock,
        min_stock: initialData.min_stock,
      });
    } else {
      setFormData({
        name: '',
        unit: 'kg',
        current_stock: 0,
        min_stock: 0,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Ingredient' : 'Add Ingredient'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="Enter ingredient name"
            />
          </div>
          <div>
            <label
              htmlFor="unit"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              id="unit"
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
            >
              <option value="kg">kg</option>
              <option value="liters">liters</option>
              <option value="grams">grams</option>
              <option value="pieces">pieces</option>
              <option value="units">units</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="current_stock"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Current Stock
            </label>
            <input
              type="number"
              id="current_stock"
              min="0"
              inputMode="decimal"
              value={formData.current_stock}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  current_stock: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
            />
          </div>
          <div>
            <label
              htmlFor="min_stock"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Min Stock
            </label>
            <input
              type="number"
              id="min_stock"
              min="0"
              inputMode="decimal"
              value={formData.min_stock}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  min_stock: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 disabled:opacity-50 transition-all duration-150 touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 touch-manipulation hover:shadow-md active:scale-[0.98]"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; ingredient: Ingredient | null }>({
    isOpen: false,
    ingredient: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { sortedData, handleSort, sortConfig } = useSortable(ingredients);

  useEffect(() => {
    fetchIngredients();
  }, []);

  // Auto-refresh when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchIngredients();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ingredients');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch ingredients');
      }
      const data = await response.json();
      console.log('Fetched ingredients:', data); // Debug log
      setIngredients(data);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch ingredients. Please try again.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleAdd = () => {
    setEditingIngredient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (ingredient: Ingredient) => {
    setDeleteDialog({ isOpen: true, ingredient });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.ingredient) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/ingredients/${deleteDialog.ingredient.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete ingredient');
      }

      showToast('Ingredient deleted successfully', 'success');
      setDeleteDialog({ isOpen: false, ingredient: null });
      fetchIngredients();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete ingredient. Please try again.';
      showToast(message, 'error');
      setDeleteDialog({ isOpen: false, ingredient: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (formData: IngredientFormData) => {
    try {
      setIsSubmitting(true);
      const url = editingIngredient
        ? `/api/ingredients/${editingIngredient.id}`
        : '/api/ingredients';
      const method = editingIngredient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save ingredient');
      }

      showToast(
        editingIngredient
          ? 'Ingredient updated successfully'
          : 'Ingredient created successfully',
        'success'
      );
      setIsModalOpen(false);
      setEditingIngredient(null);
      // Reset form will happen automatically via useEffect when isOpen changes
      await fetchIngredients();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save ingredient. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Ingredients
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => fetchIngredients()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
            >
              Refresh
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Ingredient
            </button>
          </div>
        </div>

        {loading ? (
          <Loading message="Loading ingredients..." />
        ) : ingredients.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              No ingredients found. Add your first ingredient to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <SortableHeader
                        label="Name"
                        sortKey="name"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Unit"
                        sortKey="unit"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Current Stock"
                        sortKey="current_stock"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Min Stock"
                        sortKey="min_stock"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                    {sortedData.map((ingredient) => {
                      const currentStock = ingredient.current_stock || 0;
                      const isLowStock = currentStock < ingredient.min_stock;
                      return (
                        <tr
                          key={ingredient.id}
                          className={`
                            hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 cursor-pointer
                            ${isLowStock ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                          `}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {ingredient.name}
                              {isLowStock && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                  (Low Stock)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {ingredient.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                            {ingredient.current_stock || 0} {ingredient.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {ingredient.min_stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(ingredient)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                                aria-label="Edit ingredient"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(ingredient)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                                aria-label="Delete ingredient"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {ingredients.map((ingredient) => {
                const currentStock = ingredient.current_stock || 0;
                const isLowStock = currentStock < ingredient.min_stock;
                return (
                  <div
                    key={ingredient.id}
                    className={`
                      bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3
                      ${isLowStock ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : ''}
                      hover:shadow-md transition-shadow duration-150
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          {ingredient.name}
                        </h3>
                        {isLowStock && (
                          <span className="inline-block mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                            Low Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 active:scale-95"
                          aria-label="Edit ingredient"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ingredient)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 active:scale-95"
                          aria-label="Delete ingredient"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Unit
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {ingredient.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Min Stock
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {ingredient.min_stock}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Current Stock
                        </p>
                        <p className={`text-lg font-bold ${
                          isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {ingredient.current_stock || 0} {ingredient.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <IngredientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIngredient(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingIngredient}
        isLoading={isSubmitting}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Ingredient"
        message={`Are you sure you want to delete "${deleteDialog.ingredient?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, ingredient: null })}
        isLoading={isDeleting}
      />
    </>
  );
}

