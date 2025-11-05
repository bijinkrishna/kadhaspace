'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { SalesComparison, SalesMetric } from '@/types';

export function SalesComparison() {
  const [data, setData] = useState<SalesComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesComparison();
  }, []);

  async function fetchSalesComparison() {
    try {
      const { data: salesData, error } = await supabase
        .from('sales_comparison')
        .select('*')
        .single();

      if (error) throw error;
      setData(salesData);
    } catch (error) {
      console.error('Error fetching sales comparison:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!data) {
    return <div>No sales data available</div>;
  }

  const metrics: SalesMetric[] = [
    {
      label: 'Revenue',
      current: data.current_month_mtd_revenue,
      previousMTD: data.previous_month_mtd_revenue,
      previousFull: data.previous_month_full_revenue,
      mtdChange: data.current_month_mtd_revenue - data.previous_month_mtd_revenue,
      mtdChangePercent: data.previous_month_mtd_revenue > 0 
        ? ((data.current_month_mtd_revenue - data.previous_month_mtd_revenue) / data.previous_month_mtd_revenue) * 100 
        : 0,
      fullChange: data.current_month_mtd_revenue - data.previous_month_full_revenue,
      fullChangePercent: data.previous_month_full_revenue > 0
        ? ((data.current_month_mtd_revenue - data.previous_month_full_revenue) / data.previous_month_full_revenue) * 100
        : 0,
    },
    {
      label: 'Profit',
      current: data.current_month_mtd_profit,
      previousMTD: data.previous_month_mtd_profit,
      previousFull: data.previous_month_full_profit,
      mtdChange: data.current_month_mtd_profit - data.previous_month_mtd_profit,
      mtdChangePercent: data.previous_month_mtd_profit > 0
        ? ((data.current_month_mtd_profit - data.previous_month_mtd_profit) / data.previous_month_mtd_profit) * 100
        : 0,
      fullChange: data.current_month_mtd_profit - data.previous_month_full_profit,
      fullChangePercent: data.previous_month_full_profit > 0
        ? ((data.current_month_mtd_profit - data.previous_month_full_profit) / data.previous_month_full_profit) * 100
        : 0,
    },
    {
      label: 'Orders',
      current: data.current_month_mtd_orders,
      previousMTD: data.previous_month_mtd_orders,
      previousFull: data.previous_month_full_orders,
      mtdChange: data.current_month_mtd_orders - data.previous_month_mtd_orders,
      mtdChangePercent: data.previous_month_mtd_orders > 0
        ? ((data.current_month_mtd_orders - data.previous_month_mtd_orders) / data.previous_month_mtd_orders) * 100
        : 0,
      fullChange: data.current_month_mtd_orders - data.previous_month_full_orders,
      fullChangePercent: data.previous_month_full_orders > 0
        ? ((data.current_month_mtd_orders - data.previous_month_full_orders) / data.previous_month_full_orders) * 100
        : 0,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Sales Comparison</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: SalesMetric }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const formatValue = (value: number) => {
    return metric.label === 'Orders' ? formatNumber(value) : formatCurrency(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{metric.label}</h3>
      
      {/* Current Month MTD */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900">{formatValue(metric.current)}</p>
        <p className="text-xs text-gray-500">This Month (MTD)</p>
      </div>

      {/* Comparison with Previous Month MTD */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">vs Last Month MTD:</span>
          <span className="text-sm font-medium text-gray-900">
            {formatValue(metric.previousMTD)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">Change:</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold ${
              metric.mtdChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.mtdChange >= 0 ? '+' : ''}{formatValue(metric.mtdChange)}
            </span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              metric.mtdChangePercent >= 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {metric.mtdChangePercent >= 0 ? '+' : ''}{metric.mtdChangePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Comparison with Previous Month Full */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">vs Last Month (Full):</span>
          <span className="text-sm font-medium text-gray-900">
            {formatValue(metric.previousFull)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">Difference:</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold ${
              metric.fullChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.fullChange >= 0 ? '+' : ''}{formatValue(metric.fullChange)}
            </span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              metric.fullChangePercent >= 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {metric.fullChangePercent >= 0 ? '+' : ''}{metric.fullChangePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

