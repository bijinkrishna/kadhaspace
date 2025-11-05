'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ChefHat, 
  DollarSign, 
  Clock,
  Eye,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  portion_size: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: string;
  is_active: boolean;
  current_cost: number;
  ingredient_count: number;
}

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecipes();
  }, [categoryFilter]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      let url = '/api/recipes?t=' + Date.now();
      if (categoryFilter) {
        url += `&category=${categoryFilter}`;
      }

      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete recipe "${name}"?`)) return;

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Recipe deleted!');
        fetchRecipes();
      } else {
        alert('❌ Failed to delete recipe');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('❌ Error deleting recipe');
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Sides', 'Breakfast', 'Snacks'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-orange-600" />
              Recipe Management
            </h1>
            <p className="text-gray-600 mt-1">Manage recipes and calculate COGS</p>
          </div>
          <button
            onClick={() => router.push('/recipes/new')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Recipe
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Recipes</div>
            <div className="text-3xl font-bold text-gray-900">{recipes.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active Recipes</div>
            <div className="text-3xl font-bold text-green-600">
              {recipes.filter(r => r.is_active).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Avg COGS</div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{recipes.length > 0 
                ? (recipes.reduce((sum, r) => sum + r.current_cost, 0) / recipes.length).toFixed(2)
                : '0.00'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Categories</div>
            <div className="text-3xl font-bold text-purple-600">
              {new Set(recipes.map(r => r.category).filter(Boolean)).size}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 items-center">
            <Filter className="w-5 h-5 text-gray-400" />
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recipes Grid */}
        {filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600 mb-2">No recipes found</p>
            <p className="text-gray-500 mb-4">Create your first recipe to get started</p>
            <button
              onClick={() => router.push('/recipes/new')}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Create Recipe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Recipe Header */}
                <div className="p-6 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{recipe.name}</h3>
                    {!recipe.is_active && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {recipe.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
                  )}
                  {recipe.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {recipe.category}
                    </span>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">COGS per portion</span>
                    <span className="font-bold text-green-600 text-lg">
                      ₹{recipe.current_cost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ingredients</span>
                    <span className="font-semibold">{recipe.ingredient_count} items</span>
                  </div>

                  {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {recipe.prep_time_minutes && `Prep: ${recipe.prep_time_minutes}m`}
                        {recipe.prep_time_minutes && recipe.cook_time_minutes && ' • '}
                        {recipe.cook_time_minutes && `Cook: ${recipe.cook_time_minutes}m`}
                      </span>
                    </div>
                  )}

                  {recipe.difficulty && (
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {recipe.difficulty.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50 flex gap-2">
                  <button
                    onClick={() => router.push(`/recipes/${recipe.id}`)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-white flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id, recipe.name)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


