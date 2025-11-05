import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get sales data for charts
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('sale_date, total_revenue, total_cost, gross_profit, profit_margin, status')
      .order('sale_date', { ascending: true });

    if (salesError) throw salesError;

    // Process data for daily revenue trend (last 7 days)
    const last7Days: { [key: string]: { revenue: number; profit: number; orders: number } } = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      last7Days[dateKey] = { revenue: 0, profit: 0, orders: 0 };
    }

    (allSales || []).forEach((sale: any) => {
      const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
      if (last7Days[saleDate]) {
        last7Days[saleDate].revenue += sale.total_revenue || 0;
        last7Days[saleDate].profit += sale.gross_profit || 0;
        last7Days[saleDate].orders += 1;
      }
    });

    const dailyTrend = Object.entries(last7Days).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: data.revenue,
      profit: data.profit,
      orders: data.orders,
    }));

    // Sales distribution by status
    const statusDistribution = (allSales || []).reduce((acc: any, sale: any) => {
      const status = sale.status || 'unknown';
      if (!acc[status]) {
        acc[status] = { count: 0, revenue: 0 };
      }
      acc[status].count += 1;
      acc[status].revenue += sale.total_revenue || 0;
      return acc;
    }, {});

    const salesDistribution = Object.entries(statusDistribution).map(([status, data]: [string, any]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: data.count,
      revenue: data.revenue,
    }));

    // Monthly data for last 3 months
    const monthlyData: { [key: string]: { revenue: number; cogs: number; profit: number } } = {};
    const currentMonth = new Date();
    
    for (let i = 2; i >= 0; i--) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { revenue: 0, cogs: 0, profit: 0 };
    }

    (allSales || []).forEach((sale: any) => {
      const saleDate = new Date(sale.sale_date);
      const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += sale.total_revenue || 0;
        monthlyData[monthKey].cogs += sale.total_cost || 0;
        monthlyData[monthKey].profit += sale.gross_profit || 0;
      }
    });

    const monthlyComparison = Object.entries(monthlyData).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenue: data.revenue,
      cogs: data.cogs,
      profit: data.profit,
    }));

    // Profit margin trend (last 7 days)
    const profitMarginTrend = Object.entries(last7Days).map(([date, data]) => {
      const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        margin: Math.round(margin * 10) / 10, // Round to 1 decimal
      };
    });

    return NextResponse.json({
      dailyTrend,
      salesDistribution,
      monthlyComparison,
      profitMarginTrend,
    });
  } catch (error: any) {
    console.error('❌ Charts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}

