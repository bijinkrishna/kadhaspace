'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
  PackageCheck,
  FileEdit,
  DollarSign,
  CreditCard,
  ChefHat,
  ShoppingBag,
  Percent,
  BarChart3,
  Clock,
  Receipt,
  Calculator
} from 'lucide-react';
import { SalesComparison } from '@/app/components/SalesComparison';
import { RevenueTrendChart } from '@/app/components/charts/RevenueTrendChart';
import { DailySalesChart } from '@/app/components/charts/DailySalesChart';
import { MonthlyComparisonChart } from '@/app/components/charts/MonthlyComparisonChart';
import { ProfitMarginChart } from '@/app/components/charts/ProfitMarginChart';
import OpexTile from '@/app/components/OpexTile';
import { usePermissions } from '@/lib/usePermissions';

interface DashboardData {
  totalIngredients: number;
  pendingPOs: number;
  lowStockCount: number;
  todayReceipts: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    stock_quantity: number;
    min_stock_level: number;
    unit: string;
  }>;
  pendingPOsList: Array<{
    id: string;
    po_number: string;
    vendor_name: string;
    total_amount: number;
    total_items_count: number;
  }>;
  totalPaid: number;
  totalOutstanding: number;
  thisMonthPaid: number;
  recentPayments: Array<{
    id: string;
    payment_number: string;
    payment_date: string;
    amount: number;
    po_number: string;
    vendor_name: string;
  }>;
  averageCOGS: number;
  totalSalesRevenue: number;
  totalSalesCOGS: number;
  totalGrossProfit: number;
  overallProfitMargin: number;
  thisMonthRevenue: number;
  thisMonthCOGS: number;
  thisMonthProfit: number;
  thisMonthMargin: number;
  todayRevenue: number;
  todayCOGS: number;
  todayProfit: number;
  pendingSalesCount: number;
  recentSales: Array<{
    id: string;
    sale_number: string;
    sale_date: string;
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    profit_margin: number;
    status: string;
  }>;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'green' | 'orange' | 'blue' | 'purple' | 'red';
}

function MetricCard({ label, value, subtitle, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-600 border-gray-200',
    orange: 'text-orange-600 border-gray-200',
    blue: 'text-slate-600 border-gray-200',
    purple: 'text-purple-600 border-gray-200',
    red: 'text-red-600 border-gray-200'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${colorClasses[color]} p-5`}>
      {icon && <div className="mb-2">{icon}</div>}
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colorClasses[color].split(' ')[0]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: 'blue' | 'red' | 'green' | 'orange' | 'purple';
  onClick?: () => void;
}

function StatusCard({ icon, label, value, color = 'blue', onClick }: StatusCardProps) {
  const colorClasses = {
    blue: 'bg-gray-50 border-gray-200 text-slate-600',
    red: 'bg-gray-50 border-gray-200 text-red-600',
    green: 'bg-gray-50 border-gray-200 text-green-600',
    orange: 'bg-gray-50 border-gray-200 text-orange-600',
    purple: 'bg-gray-50 border-gray-200 text-purple-600'
  };

  return (
    <div
      onClick={onClick}
      className={`${colorClasses[color]} rounded-lg shadow-sm border p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow hover:bg-gray-100' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs font-medium text-gray-700">{label}</div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  onViewAll?: () => void;
}

function SectionHeader({ title, icon, onViewAll }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="text-sm text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1"
        >
          View All <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'today'>('month');
  const { role, loading: roleLoading } = usePermissions();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard?t=' + Date.now(), {
        cache: 'no-store',
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && role === 'staff') {
      router.replace('/staff');
    }
  }, [role, roleLoading, router]);

  useEffect(() => {
    if (!roleLoading && role !== 'staff') {
      fetchDashboardData();
    }
  }, [role, roleLoading, fetchDashboardData]);

  if (!roleLoading && role === 'staff') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const salesData = timeRange === 'month' 
    ? {
        revenue: data?.thisMonthRevenue || 0,
        cogs: data?.thisMonthCOGS || 0,
        profit: data?.thisMonthProfit || 0,
        margin: data?.thisMonthMargin || 0
      }
    : {
        revenue: data?.todayRevenue || 0,
        cogs: data?.todayCOGS || 0,
        profit: data?.todayProfit || 0,
        margin: data?.todayRevenue ? ((data.todayProfit / data.todayRevenue) * 100) : 0
      };

  const maxBarValue = Math.max(salesData.revenue, salesData.cogs, salesData.profit, 1);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Overview of your inventory and sales</p>
        </div>

        {/* Sales Comparison Analysis */}
        <SalesComparison />

        {/* Operating Expenses Tile */}
        <OpexTile />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueTrendChart />
          <DailySalesChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyComparisonChart />
          <ProfitMarginChart />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/intends/new')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md font-medium text-xs sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-gray-700 text-center">New Intend</span>
            </button>
            <button
              onClick={() => router.push('/recipes/new')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md font-medium text-xs sm:text-base"
            >
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-gray-700 text-center">New Recipe</span>
            </button>
            <button
              onClick={() => router.push('/purchase-orders')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md font-medium text-xs sm:text-base"
            >
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-gray-700 text-center">Receive Stock</span>
            </button>
            <button
              onClick={() => router.push('/payments')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md font-medium text-xs sm:text-base"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-gray-700 text-center">Record Payment</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-4 bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="Sales Performance"
              icon={<ShoppingBag className="w-6 h-6 text-gray-700" />}
            />

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === 'month'
                    ? 'bg-slate-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeRange('today')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === 'today'
                    ? 'bg-slate-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <MetricCard
                label="Revenue"
                value={`₹${(salesData.revenue / 1000).toFixed(1)}K`}
                subtitle={timeRange === 'month' ? 'This month' : 'Today'}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                color="green"
              />
              <MetricCard
                label="COGS"
                value={`₹${(salesData.cogs / 1000).toFixed(1)}K`}
                subtitle="Production cost"
                icon={<Calculator className="w-5 h-5 text-gray-600" />}
                color="blue"
              />
              <MetricCard
                label="Profit"
                value={`₹${(salesData.profit / 1000).toFixed(1)}K`}
                subtitle="Revenue - COGS"
                icon={<TrendingUp className="w-5 h-5 text-slate-600" />}
                color="blue"
              />
              <MetricCard
                label="Margin"
                value={`${salesData.margin.toFixed(1)}%`}
                subtitle={salesData.margin >= 30 ? 'Excellent' : salesData.margin >= 15 ? 'Good' : 'Low'}
                icon={<Percent className="w-5 h-5 text-purple-600" />}
                color={salesData.margin >= 30 ? 'green' : salesData.margin >= 15 ? 'purple' : 'red'}
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Comparison</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">Revenue</span>
                    <span className="text-xs font-semibold text-slate-600">
                      ₹{salesData.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-slate-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${(salesData.revenue / maxBarValue) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">COGS</span>
                    <span className="text-xs font-semibold text-slate-500">
                      ₹{salesData.cogs.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-slate-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${(salesData.cogs / maxBarValue) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">Profit</span>
                    <span className="text-xs font-semibold text-slate-600">
                      ₹{salesData.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-slate-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${(salesData.profit / maxBarValue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/sales')}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                View All Sales
              </button>
              <button
                onClick={() => router.push('/sales/new')}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
              >
                New Sale
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="Payment Summary"
              icon={<CreditCard className="w-5 h-5 text-gray-700" />}
            />

            <div className="space-y-4 mb-4">
              <MetricCard
                label="Total Paid"
                value={`₹${((data?.totalPaid || 0) / 1000).toFixed(1)}K`}
                subtitle="All time"
                icon={<DollarSign className="w-4 h-4 text-green-600" />}
                color="green"
              />
              <MetricCard
                label="Outstanding"
                value={`₹${((data?.totalOutstanding || 0) / 1000).toFixed(1)}K`}
                subtitle="Pending"
                icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
                color="orange"
              />
              <MetricCard
                label="This Month"
                value={`₹${((data?.thisMonthPaid || 0) / 1000).toFixed(1)}K`}
                subtitle="Payments"
                icon={<Clock className="w-4 h-4 text-slate-600" />}
                color="blue"
              />
              <MetricCard
                label="Avg COGS"
                value={`₹${(data?.averageCOGS || 0).toFixed(2)}`}
                subtitle="Per portion"
                icon={<Calculator className="w-4 h-4 text-gray-600" />}
                color="blue"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push('/payments')}
                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
              >
                View Payments
              </button>
              <button
                onClick={() => router.push('/recipes')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                View Recipes
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="System Status"
              icon={<Package className="w-5 h-5 text-gray-700" />}
            />

            <div className="space-y-3">
              <StatusCard
                icon={<Package className="w-6 h-6 text-slate-600" />}
                label="Items in System"
                value={data?.totalIngredients || 0}
                color="blue"
                onClick={() => router.push('/ingredients')}
              />
              <StatusCard
                icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
                label="Below Minimum"
                value={data?.lowStockCount || 0}
                color="red"
                onClick={() => router.push('/stock')}
              />
              <StatusCard
                icon={<Receipt className="w-6 h-6 text-green-600" />}
                label="GRNs Today"
                value={data?.todayReceipts || 0}
                color="green"
              />
              <StatusCard
                icon={<FileEdit className="w-6 h-6 text-orange-600" />}
                label="Awaiting Receipt"
                value={data?.pendingPOs || 0}
                color="orange"
                onClick={() => router.push('/purchase-orders')}
              />
              <StatusCard
                icon={<ShoppingBag className="w-6 h-6 text-slate-600" />}
                label="Unprocessed Sales"
                value={data?.pendingSalesCount || 0}
                color="blue"
                onClick={() => router.push('/sales')}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="Low Stock Alerts"
              icon={<AlertTriangle className="w-5 h-5 text-gray-700" />}
              onViewAll={() => router.push('/stock')}
            />
            <div className="space-y-2">
              {data?.lowStockItems && data.lowStockItems.length > 0 ? (
                data.lowStockItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/stock/history/${item.id}`)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{item.name}</div>
                    <div className="text-xs text-red-600 mt-1">
                      {item.stock_quantity} {item.unit} (min: {item.min_stock_level})
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  No low stock items
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="Pending POs"
              icon={<Receipt className="w-5 h-5 text-gray-700" />}
              onViewAll={() => router.push('/purchase-orders')}
            />
            <div className="space-y-2">
              {data?.pendingPOsList && data.pendingPOsList.length > 0 ? (
                data.pendingPOsList.slice(0, 4).map((po) => (
                  <div
                    key={po.id}
                    onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{po.po_number}</div>
                    <div className="text-xs text-gray-600 mt-1">{po.vendor_name}</div>
                    <div className="text-xs font-semibold text-gray-900 mt-1">
                      ₹{po.total_amount.toLocaleString()} • {po.total_items_count} items
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  No pending POs
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="Recent Sales"
              icon={<ShoppingBag className="w-5 h-5 text-gray-700" />}
              onViewAll={() => router.push('/sales')}
            />
            <div className="space-y-2">
              {data?.recentSales && data.recentSales.length > 0 ? (
                data.recentSales.slice(0, 4).map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => router.push(`/sales/${sale.id}`)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-gray-900">{sale.sale_number}</div>
                      <div className="text-sm font-semibold text-green-600">
                        ₹{sale.total_revenue.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          sale.status === 'processed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {sale.status}
                      </span>
                      <span className="text-xs text-gray-600">
                        {sale.profit_margin.toFixed(1)}% margin
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  No recent sales
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <SectionHeader
              title="Recent Payments"
              icon={<CreditCard className="w-5 h-5 text-gray-700" />}
              onViewAll={() => router.push('/payments')}
            />
            <div className="space-y-2">
              {data?.recentPayments && data.recentPayments.length > 0 ? (
                data.recentPayments.slice(0, 4).map((payment) => (
                  <div
                    key={payment.id}
                    onClick={() => router.push(`/payments/${payment.id}`)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-gray-900">{payment.payment_number}</div>
                      <div className="text-sm font-semibold text-green-600">
                        ₹{payment.amount.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">{payment.po_number}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {payment.vendor_name} • {new Date(payment.payment_date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  No recent payments
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
