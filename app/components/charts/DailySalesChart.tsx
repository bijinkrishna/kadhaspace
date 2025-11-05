'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface DailyData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export function DailySalesChart() {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const response = await fetch('/api/charts?t=' + Date.now());
      const result = await response.json();
      setData(result.dailyTrend || []);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Sales Performance</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          No sales data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Daily Sales Performance</h3>
        <span className="text-sm text-gray-500 ml-auto">Last 7 days</span>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'revenue' || name === 'profit') {
                return [`₹${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)];
              }
              return [value, name.charAt(0).toUpperCase() + name.slice(1)];
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="square"
          />
          <Bar 
            yAxisId="left"
            dataKey="revenue" 
            fill="#10b981" 
            name="Revenue"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            yAxisId="left"
            dataKey="profit" 
            fill="#3b82f6" 
            name="Profit"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            yAxisId="right"
            dataKey="orders" 
            fill="#f59e0b" 
            name="Orders"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-600">Avg Revenue/Day</div>
          <div className="font-semibold text-green-600">
            ₹{data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.revenue, 0) / data.length).toLocaleString() : '0'}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Avg Profit/Day</div>
          <div className="font-semibold text-blue-600">
            ₹{data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.profit, 0) / data.length).toLocaleString() : '0'}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Avg Orders/Day</div>
          <div className="font-semibold text-orange-600">
            {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.orders, 0) / data.length) : '0'}
          </div>
        </div>
      </div>
    </div>
  );
}

