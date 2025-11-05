'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  ChefHat,
  Save,
  X,
  DollarSign
} from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  last_price: number;
}

interface RecipeIngredient {
  id?: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: string;
  unit: string;
  notes: string;
  cost?: number;
}

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [recipeId, setRecipeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    portion_size: '1 portion',
    serving_size: '1',
    prep_time_minutes: '',
    cook_time_minutes: '',
    difficulty: 'medium',
    instructions: '',
    notes: '',
    is_active: true,
    selling_price: ''  // Add this
  });
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setRecipeId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (recipeId) {
      fetchIngredients();
      fetchRecipe();
    }
  }, [recipeId]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      const data = await response.json();
      setIngredients(data);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchRecipe = async () => {
    setLoadingData(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error('Recipe not found');
      
      const recipe = await response.json();
      
      // Populate form data
      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        category: recipe.category || '',
        portion_size: recipe.portion_size || '1 portion',
        serving_size: recipe.serving_size?.toString() || '1',
        prep_time_minutes: recipe.prep_time_minutes?.toString() || '',
        cook_time_minutes: recipe.cook_time_minutes?.toString() || '',
        difficulty: recipe.difficulty || 'medium',
        instructions: recipe.instructions || '',
        notes: recipe.notes || '',
        is_active: recipe.is_active !== false,
        selling_price: recipe.selling_price?.toString() || ''  // Add this
      });

      // Populate ingredients
      const recipeIngs = recipe.recipe_ingredients?.map((ri: any) => ({
        id: ri.id,
        ingredient_id: ri.ingredients?.id || '',
        ingredient_name: ri.ingredients?.name || '',
        quantity: ri.quantity?.toString() || '',
        unit: ri.unit || '',
        notes: ri.notes || ''
      })) || [];
      
      setRecipeIngredients(recipeIngs);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      alert('Failed to load recipe');
      router.push('/recipes');
    } finally {
      setLoadingData(false);
    }
  };

  const addIngredient = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      {
        ingredient_id: '',
        quantity: '',
        unit: '',
        notes: ''
      }
    ]);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const getAvailableIngredients = (currentIndex: number) => {
    const selectedIds = recipeIngredients
      .map((ri, idx) => idx !== currentIndex ? ri.ingredient_id : null)
      .filter(Boolean);
    
    return ingredients.filter(ing => !selectedIds.includes(ing.id));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'ingredient_id') {
      // Check for duplicate
      const isDuplicate = recipeIngredients.some((ri, idx) => 
        idx !== index && ri.ingredient_id === value
      );
      
      if (isDuplicate) {
        alert('⚠️ This ingredient is already added to the recipe!');
        return;
      }
      
      const selectedIng = ingredients.find(ing => ing.id === value);
      if (selectedIng) {
        updated[index].unit = selectedIng.unit;
        updated[index].ingredient_name = selectedIng.name;
        updated[index].cost = parseFloat(updated[index].quantity || '0') * selectedIng.last_price;
      }
    }
    
    // Update cost when quantity changes
    if (field === 'quantity') {
      const selectedIng = ingredients.find(ing => ing.id === updated[index].ingredient_id);
      if (selectedIng) {
        updated[index].cost = parseFloat(value || '0') * selectedIng.last_price;
      }
    }
    
    setRecipeIngredients(updated);
  };

  const calculateTotalCost = () => {
    return recipeIngredients.reduce((sum, ri) => {
      const ing = ingredients.find(i => i.id === ri.ingredient_id);
      if (ing && ri.quantity) {
        return sum + (parseFloat(ri.quantity) * ing.last_price);
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recipeIngredients.length === 0) {
      alert('Please add at least one ingredient');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          ingredients: recipeIngredients.map(ri => ({
            ingredient_id: ri.ingredient_id,
            quantity: ri.quantity,
            unit: ri.unit,
            notes: ri.notes
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update recipe');
      }

      alert('✅ Recipe updated successfully!');
      router.push(`/recipes/${recipeId}`);
    } catch (error: any) {
      console.error('Error updating recipe:', error);
      alert('❌ Failed to update recipe: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading recipe...</div>
      </div>
    );
  }

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Sides', 'Breakfast', 'Snacks'];
  const totalCost = calculateTotalCost();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-orange-600" />
              Edit Recipe
            </h1>
            <p className="text-gray-600 mt-1">Update recipe details and ingredients</p>
          </div>
          <button
            onClick={() => router.push(`/recipes/${recipeId}`)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portion Size
                </label>
                <input
                  type="text"
                  value={formData.portion_size}
                  onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serving Size (number)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.serving_size}
                  onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prep Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.prep_time_minutes}
                  onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cook Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.cook_time_minutes}
                  onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Menu price for customers"
                />
                <div className="text-xs text-gray-500 mt-1">
                  This will auto-fill when creating sales
                </div>
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Recipe</span>
                </label>
              </div>
            </div>
          </div>

          {/* Ingredients - Same as create page */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Ingredients</h2>
              <button
                type="button"
                onClick={addIngredient}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Ingredient
              </button>
            </div>

            {recipeIngredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No ingredients added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recipeIngredients.map((ri, index) => {
                  const selectedIng = ingredients.find(i => i.id === ri.ingredient_id);
                  const cost = selectedIng && ri.quantity 
                    ? parseFloat(ri.quantity) * selectedIng.last_price 
                    : 0;

                  const availableIngredients = getAvailableIngredients(index);

                  return (
                    <div key={index} className="flex gap-3 items-start p-4 border rounded-lg bg-gray-50">
                      <div className="flex-1 grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                          <select
                            value={ri.ingredient_id}
                            onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                            required
                          >
                            <option value="">Select ingredient</option>
                            {ri.ingredient_id && !availableIngredients.find(ing => ing.id === ri.ingredient_id) && selectedIng && (
                              <option value={ri.ingredient_id}>
                                {selectedIng.name} (₹{selectedIng.last_price}/{selectedIng.unit})
                              </option>
                            )}
                            {availableIngredients.map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} (₹{ing.last_price}/{ing.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            value={ri.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                            placeholder="Qty"
                            required
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="text"
                            value={ri.unit}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                            placeholder="Unit"
                            required
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="text"
                            value={ri.notes}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                            placeholder="Notes"
                          />
                        </div>

                        <div className="col-span-1 flex items-center justify-end">
                          <span className="text-sm font-semibold text-green-600">
                            ₹{cost.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total COGS (per portion)</div>
                    <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                      <DollarSign className="w-6 h-6" />
                      ₹{totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Add this after the Total COGS display */}
                {totalCost > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">💡 Pricing Suggestions</h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <div className="text-xs text-gray-600 mb-1">30% Markup</div>
                        <div className="text-lg font-bold text-blue-700">₹{(totalCost * 1.3).toFixed(2)}</div>
                        <div className="text-xs text-green-600">Moderate profit</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <div className="text-xs text-gray-600 mb-1">50% Markup</div>
                        <div className="text-lg font-bold text-purple-700">₹{(totalCost * 1.5).toFixed(2)}</div>
                        <div className="text-xs text-green-600">Good profit</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <div className="text-xs text-gray-600 mb-1">100% Markup</div>
                        <div className="text-lg font-bold text-green-700">₹{(totalCost * 2).toFixed(2)}</div>
                        <div className="text-xs text-green-600">High profit</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <div className="text-xs text-gray-600 mb-1">150% Markup</div>
                        <div className="text-lg font-bold text-orange-700">₹{(totalCost * 2.5).toFixed(2)}</div>
                        <div className="text-xs text-green-600">Premium</div>
                      </div>
                    </div>
                    {formData.selling_price && parseFloat(formData.selling_price) > 0 && (
                      <div className="mt-3 p-2 bg-white rounded border border-green-300">
                        <div className="text-sm">
                          <span className="text-gray-700">Your markup: </span>
                          <span className="font-bold text-green-700">
                            {(((parseFloat(formData.selling_price) - totalCost) / totalCost) * 100).toFixed(1)}%
                          </span>
                          <span className="text-gray-700"> • Profit: </span>
                          <span className="font-bold text-blue-700">
                            ₹{(parseFloat(formData.selling_price) - totalCost).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={6}
            />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/recipes/${recipeId}`)}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || recipeIngredients.length === 0}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Updating...' : 'Update Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

