'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { IngredientMovementAnalysis, MovementStats } from '@/types';

export function IngredientMovementDashboard() {
  const [items, setItems] = useState<IngredientMovementAnalysis[]>([]);
  const [stats, setStats] = useState<MovementStats>({
    fast_moving: 0,
    medium_moving: 0,
    slow_moving: 0,
    dead_stock: 0,
    total_items: 0,
  });
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [inventoryValues, setInventoryValues] = useState<{
    fast_moving: number;
    medium_moving: number;
    slow_moving: number;
    dead_stock: number;
  }>({
    fast_moving: 0,
    medium_moving: 0,
    slow_moving: 0,
    dead_stock: 0,
  });

  useEffect(() => {
    fetchMovementData();
  }, []);

  async function fetchMovementData() {
    try {
      const { data, error } = await supabase
        .from('ingredient_movement_analysis')
        .select('*');

      if (error) throw error;

      setItems(data || []);
      
      // Calculate stats with inventory values
      const statsWithValues = {
        fast_moving: { count: 0, inventoryValue: 0 },
        medium_moving: { count: 0, inventoryValue: 0 },
        slow_moving: { count: 0, inventoryValue: 0 },
        dead_stock: { count: 0, inventoryValue: 0 },
        total_items: 0,
      };

      (data || []).forEach((item) => {
        const category = item.movement_category;
        const inventoryValue = item.stock_quantity * item.last_price;
        
        if (category === 'fast_moving' || category === 'medium_moving' || 
            category === 'slow_moving' || category === 'dead_stock') {
          const categoryKey = category as 'fast_moving' | 'medium_moving' | 'slow_moving' | 'dead_stock';
          statsWithValues[categoryKey].count++;
          statsWithValues[categoryKey].inventoryValue += inventoryValue;
        }
        statsWithValues.total_items++;
      });

      const newStats = {
        fast_moving: statsWithValues.fast_moving.count,
        medium_moving: statsWithValues.medium_moving.count,
        slow_moving: statsWithValues.slow_moving.count,
        dead_stock: statsWithValues.dead_stock.count,
        total_items: statsWithValues.total_items,
      };

      // Store inventory values separately for display
      const inventoryValues = {
        fast_moving: statsWithValues.fast_moving.inventoryValue,
        medium_moving: statsWithValues.medium_moving.inventoryValue,
        slow_moving: statsWithValues.slow_moving.inventoryValue,
        dead_stock: statsWithValues.dead_stock.inventoryValue,
      };
      
      setStats(newStats);
      setInventoryValues(inventoryValues);
    } catch (error) {
      console.error('Error fetching movement data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.movement_category === filter);

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ingredient Movement Analysis</h2>
        <button 
          onClick={fetchMovementData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Fast Moving"
          count={stats.fast_moving}
          percentage={stats.total_items > 0 ? (stats.fast_moving / stats.total_items) * 100 : 0}
          inventoryValue={inventoryValues.fast_moving}
          color="green"
          active={filter === 'fast_moving'}
          onClick={() => setFilter(filter === 'fast_moving' ? 'all' : 'fast_moving')}
        />
        <StatsCard
          label="Medium Moving"
          count={stats.medium_moving}
          percentage={stats.total_items > 0 ? (stats.medium_moving / stats.total_items) * 100 : 0}
          inventoryValue={inventoryValues.medium_moving}
          color="blue"
          active={filter === 'medium_moving'}
          onClick={() => setFilter(filter === 'medium_moving' ? 'all' : 'medium_moving')}
        />
        <StatsCard
          label="Slow Moving"
          count={stats.slow_moving}
          percentage={stats.total_items > 0 ? (stats.slow_moving / stats.total_items) * 100 : 0}
          inventoryValue={inventoryValues.slow_moving}
          color="yellow"
          active={filter === 'slow_moving'}
          onClick={() => setFilter(filter === 'slow_moving' ? 'all' : 'slow_moving')}
        />
        <StatsCard
          label="Dead Stock"
          count={stats.dead_stock}
          percentage={stats.total_items > 0 ? (stats.dead_stock / stats.total_items) * 100 : 0}
          inventoryValue={inventoryValues.dead_stock}
          color="red"
          active={filter === 'dead_stock'}
          onClick={() => setFilter(filter === 'dead_stock' ? 'all' : 'dead_stock')}
        />
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ingredient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  30-Day Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Daily Avg
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Days to Stockout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Turnover
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <IngredientRow key={item.ingredient_id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No items found for this filter
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ 
  label, 
  count, 
  percentage,
  inventoryValue,
  color, 
  active, 
  onClick 
}: { 
  label: string; 
  count: number;
  percentage: number;
  inventoryValue: number;
  color: string; 
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  };

  const activeColors = {
    green: 'ring-2 ring-green-500 dark:ring-green-400',
    blue: 'ring-2 ring-blue-500 dark:ring-blue-400',
    yellow: 'ring-2 ring-yellow-500 dark:ring-yellow-400',
    red: 'ring-2 ring-red-500 dark:ring-red-400',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all ${colors[color as keyof typeof colors]} ${
        active ? activeColors[color as keyof typeof activeColors] : ''
      } hover:shadow-md cursor-pointer text-left`}
    >
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        {percentage.toFixed(1)}% of total
      </div>
      <div className="text-xs font-semibold mt-2 pt-2 border-t border-current/20">
        ₹{inventoryValue.toLocaleString()}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
        Inventory Value
      </div>
    </button>
  );
}

function IngredientRow({ item }: { item: IngredientMovementAnalysis }) {
  const categoryColors = {
    fast_moving: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    medium_moving: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    slow_moving: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    dead_stock: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
    no_data: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700',
  };

  const statusColors = {
    critical: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    low: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    adequate: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    overstocked: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    dead_stock: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    unknown: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">₹{item.last_price}/{item.unit}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {item.stock_quantity} {item.unit}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {item.consumption_last_30_days.toFixed(2)} {item.unit}
        <div className="text-xs text-gray-500 dark:text-gray-400">₹{item.value_consumed_30_days.toFixed(0)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {item.avg_daily_consumption.toFixed(2)} {item.unit}/day
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {item.days_until_stockout !== null ? (
          <span className={item.days_until_stockout <= 7 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
            {item.days_until_stockout} days
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">N/A</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {item.turnover_ratio !== null ? `${item.turnover_ratio.toFixed(2)}x` : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
          categoryColors[item.movement_category] || categoryColors.no_data
        }`}>
          {item.movement_category.replace(/_/g, ' ').toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusColors[item.stock_status] || statusColors.unknown
        }`}>
          {item.stock_status.toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {item.recipes_count} recipes
      </td>
    </tr>
  );
}

