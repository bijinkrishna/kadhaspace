'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  ChefHat,
  Clock,
  Package,
  TrendingUp,
  Calculator,
  Printer,
  Users
} from 'lucide-react';
import { usePermissions } from '@/lib/usePermissions';

interface CostBreakdown {
  ingredient_name: string;
  quantity_per_portion: number;
  total_quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  stock_available: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  portion_size: string;
  serving_size: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: string;
  instructions: string;
  notes: string;
  is_active: boolean;
  selling_price?: number;
  portions: number;
  cost_breakdown: CostBreakdown[];
  total_cost: number;
  cost_per_portion: number;
}

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [recipeId, setRecipeId] = useState<string>('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [portions, setPortions] = useState(1);
  const [loading, setLoading] = useState(true);
  const { canManageRecipes } = usePermissions();

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setRecipeId(resolvedParams.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (recipeId) {
      fetchRecipe(portions);
    }
  }, [recipeId, portions]);

  const fetchRecipe = async (portionCount: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/recipes/${recipeId}?portions=${portionCount}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error('Recipe not found');
      }
      
      const data = await response.json();
      setRecipe(data);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      alert('Failed to load recipe');
      router.push('/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete recipe "${recipe?.name}"?`)) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Recipe deleted!');
        router.push('/recipes');
      } else {
        alert('❌ Failed to delete recipe');
      }
    } catch (error) {
      alert('❌ Error deleting recipe');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading recipe...</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Recipe not found</div>
      </div>
    );
  }

  const costPercentages = recipe.cost_breakdown.map(item => ({
    ...item,
    percentage: (item.total_cost / recipe.total_cost) * 100
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - Hide on print */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6 print:hidden">
          <button
            onClick={() => router.push('/recipes')}
            className="flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 w-fit"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Back to Recipes</span>
          </button>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 sm:gap-2"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Print</span>
            </button>
            {canManageRecipes && (
              <>
                <button
                  onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 sm:gap-2"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 sm:gap-2"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recipe Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
                <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-orange-600 flex-shrink-0" />
                <span className="truncate">{recipe.name}</span>
              </h1>
              {recipe.description && (
                <p className="text-lg text-gray-600">{recipe.description}</p>
              )}
            </div>
            {!recipe.is_active && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                Inactive
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {recipe.category && (
              <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {recipe.category}
              </span>
            )}
            {recipe.difficulty && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {recipe.difficulty.toUpperCase()}
              </span>
            )}
            {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {recipe.prep_time_minutes && `Prep: ${recipe.prep_time_minutes}m`}
                {recipe.prep_time_minutes && recipe.cook_time_minutes && ' • '}
                {recipe.cook_time_minutes && `Cook: ${recipe.cook_time_minutes}m`}
              </span>
            )}
          </div>
        </div>

        {/* Portion Calculator */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6 mb-6 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculate COGS for Multiple Portions
              </h3>
              <p className="text-sm text-gray-600">Adjust portions to calculate total cost</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Portions:</label>
              <input
                type="number"
                min="1"
                value={portions}
                onChange={(e) => setPortions(parseInt(e.target.value) || 1)}
                className="w-24 px-3 py-2 border rounded-lg text-center font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Cost per Portion</div>
            <div className="text-3xl font-bold text-green-600">
              ₹{recipe.cost_per_portion.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              COGS (Based on latest prices)
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Selling Price</div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{(recipe.selling_price || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Menu price
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Cost as % of Selling Price</div>
            <div className={`text-3xl font-bold ${
              recipe.selling_price && recipe.selling_price > 0
                ? 'text-orange-600'
                : 'text-gray-400'
            }`}>
              {recipe.selling_price && recipe.selling_price > 0 
                ? ((recipe.cost_per_portion / recipe.selling_price) * 100).toFixed(1)
                : '0.0'
              }%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Cost percentage
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-600" />
              Ingredient Cost Breakdown
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ingredient</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Qty/Portion</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Cost</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {costPercentages.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.ingredient_name}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        {item.quantity_per_portion} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {item.total_quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        ₹{item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{item.total_cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">TOTAL:</td>
                    <td className="px-4 py-3 text-right text-lg">
                      ₹{recipe.total_cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {recipe.instructions && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Cooking Instructions</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700">
                {recipe.instructions}
              </pre>
            </div>
          </div>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2 text-yellow-900">Notes</h2>
            <p className="text-yellow-800">{recipe.notes}</p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}

