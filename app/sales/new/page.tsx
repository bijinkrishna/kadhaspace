'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  ShoppingBag,
  Save,
  X,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';

interface Recipe {
  id: string;
  name: string;
  category: string;
  current_cost: number;
  selling_price?: number;  // Add this
}

interface SaleItem {
  recipe_id: string;
  recipe_name?: string;
  quantity: string;
  selling_price: string;
  cost_per_portion?: number;
  total_revenue?: number;
  total_cost?: number;
  profit?: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes?active=true');
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const addItem = () => {
    setSaleItems([
      ...saleItems,
      {
        recipe_id: '',
        quantity: '',
        selling_price: ''
      }
    ]);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate metrics when recipe is selected
    if (field === 'recipe_id') {
      const selectedRecipe = recipes.find(r => r.id === value);
      if (selectedRecipe) {
        updated[index].recipe_name = selectedRecipe.name;
        updated[index].cost_per_portion = selectedRecipe.current_cost;
        updated[index].selling_price = selectedRecipe.selling_price?.toString() || '';  // AUTO-FILL!
        
        // Recalculate totals
        const qty = parseInt(updated[index].quantity || '0', 10) || 0;
        const price = Math.round(selectedRecipe.selling_price || 0);
        updated[index].total_cost = qty * selectedRecipe.current_cost;
        updated[index].total_revenue = qty * price;
        updated[index].profit = updated[index].total_revenue! - updated[index].total_cost!;
      }
    }
    
    // Recalculate when quantity or price changes
    if (field === 'quantity' || field === 'selling_price') {
      const selectedRecipe = recipes.find(r => r.id === updated[index].recipe_id);
      if (selectedRecipe) {
        const qty = parseInt(field === 'quantity' ? value : updated[index].quantity || '0', 10) || 0;
        const price = Math.round(parseFloat(field === 'selling_price' ? value : updated[index].selling_price || '0') || 0);
        updated[index].total_cost = qty * selectedRecipe.current_cost;
        updated[index].total_revenue = qty * price;
        updated[index].profit = updated[index].total_revenue! - updated[index].total_cost!;
      }
    }
    
    setSaleItems(updated);
  };

  const getAvailableRecipes = (currentIndex: number) => {
    const selectedIds = saleItems
      .map((item, idx) => idx !== currentIndex ? item.recipe_id : null)
      .filter(Boolean);
    
    return recipes.filter(recipe => !selectedIds.includes(recipe.id));
  };

  const calculateTotals = () => {
    const totalRevenue = saleItems.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    const totalCost = saleItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalCost, totalProfit, profitMargin };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (saleItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Check for duplicate recipes
    const recipeIds = saleItems.map(item => item.recipe_id);
    const hasDuplicates = recipeIds.some((id, idx) => recipeIds.indexOf(id) !== idx);
    
    if (hasDuplicates) {
      alert('⚠️ Cannot add the same dish multiple times in one sale');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sale_date: saleDate,
          notes,
          items: saleItems.map(item => ({
            recipe_id: item.recipe_id,
            quantity: parseInt(item.quantity, 10) || 0,
            selling_price: Math.round(parseFloat(item.selling_price) || 0)
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create sale');
      }

      alert('✅ Sale created successfully!');
      router.push('/sales');
    } catch (error: any) {
      console.error('Error creating sale:', error);
      alert('❌ Failed to create sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-green-600" />
              New Sale Entry
            </h1>
            <p className="text-gray-600 mt-1">Record daily sales and update inventory</p>
          </div>
          <button
            onClick={() => router.push('/sales')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sale Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Sale Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Date *
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>

          {/* Sale Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Dishes Sold</h2>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Dish
              </button>
            </div>

            {saleItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet</p>
                <p className="text-sm mt-1">Click "Add Dish" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saleItems.map((item, index) => {
                  const availableRecipes = getAvailableRecipes(index);
                  const selectedRecipe = recipes.find(r => r.id === item.recipe_id);

                  return (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        {/* Recipe Select */}
                        <div className="col-span-5">
                          <label className="block text-xs text-gray-600 mb-1">Dish *</label>
                          <select
                            value={item.recipe_id}
                            onChange={(e) => updateItem(index, 'recipe_id', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                            required
                          >
                            <option value="">Select dish</option>
                            {item.recipe_id && !availableRecipes.find(r => r.id === item.recipe_id) && selectedRecipe && (
                              <option value={item.recipe_id}>
                                {selectedRecipe.name} - ₹{formatNumber(selectedRecipe.current_cost)} COGS
                              </option>
                            )}
                            {availableRecipes.map(recipe => (
                              <option key={recipe.id} value={recipe.id}>
                                {recipe.name} - ₹{formatNumber(recipe.current_cost)} COGS
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                            placeholder="Qty"
                            required
                          />
                        </div>

                        {/* Selling Price */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Price (₹) *</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.selling_price}
                            onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                            placeholder="Price"
                            required
                          />
                        </div>

                        {/* Metrics */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Revenue</label>
                          <div className="text-sm font-semibold text-green-600">
                            ₹{formatNumber(item.total_revenue || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost: ₹{formatNumber(item.total_cost || 0)}
                          </div>
                        </div>

                        {/* Profit */}
                        <div className="col-span-1 flex flex-col items-end justify-between h-full">
                          <div className="text-xs text-gray-600">Profit</div>
                          <div className={`text-sm font-semibold ${
                            (item.profit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            ₹{formatNumber(item.profit || 0)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Totals */}
                <div className="border-t-2 pt-4 mt-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-700 mb-1">Total Revenue</div>
                      <div className="text-2xl font-bold text-green-700">
                        ₹{formatNumber(totals.totalRevenue)}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-sm text-orange-700 mb-1">Total Cost</div>
                      <div className="text-2xl font-bold text-orange-700">
                        ₹{formatNumber(totals.totalCost)}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-700 mb-1">Gross Profit</div>
                      <div className="text-2xl font-bold text-blue-700">
                        ₹{formatNumber(totals.totalProfit)}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm text-purple-700 mb-1 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Profit Margin
                      </div>
                      <div className="text-2xl font-bold text-purple-700">
                        {Math.round(totals.profitMargin)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/sales')}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saleItems.length === 0}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
