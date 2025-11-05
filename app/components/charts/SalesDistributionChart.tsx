'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShoppingBag } from 'lucide-react';

interface DistributionData {
  name: string;
  value: number;
  revenue: number;
}

const COLORS = {
  processed: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  unknown: '#6b7280',
};

const getColor = (name: string) => {
  const key = name.toLowerCase();
  return COLORS[key as keyof typeof COLORS] || COLORS.unknown;
};

export function SalesDistributionChart() {
  const [data, setData] = useState<DistributionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const response = await fetch('/api/charts?t=' + Date.now());
      const result = await response.json();
      setData(result.salesDistribution || []);
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
          <div className="h-64 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Sales Distribution</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              if (name === 'value') {
                return [`${value} sales`, `₹${props.payload.revenue?.toLocaleString() || 0}`];
              }
              return value;
            }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

