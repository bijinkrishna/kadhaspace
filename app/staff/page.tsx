'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Columns,
  Leaf,
  PackageSearch,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { StaffOnly } from '@/app/components/RoleGate';

interface StaffDashboardData {
  generated_at: string;
  summary: {
    totalIngredients: number;
    lowStockCount: number;
    activeRecipes: number;
    openPurchaseOrders: number;
    pendingIntends: number;
  };
  lowStockItems: Array<{
    id: string;
    name: string;
    unit: string;
    stock_quantity: number;
    min_stock_level: number;
  }>;
  pendingIntends: Array<{
    id: string;
    intend_number: string;
    created_at: string;
    status: string;
  }>;
  recentReceipts: Array<{
    id: string;
    grn_number: string;
    received_date: string;
    status: string;
    po_number?: string | null;
  }>;
  recentMovements: Array<{
    id: string;
    movement_date: string;
    movement_type: string;
    quantity: number;
    ingredient_name?: string | null;
    ingredient_unit?: string | null;
  }>;
}

const quickActions = (
  router: ReturnType<typeof useRouter>,
): Array<{
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}> => [
  {
    label: 'Create Intend',
    description: 'Raise a new ingredient request',
    icon: <PlusCircle className="h-5 w-5" />,
    action: () => router.push('/intends/new'),
  },
  {
    label: 'Receive Stock',
    description: 'Log goods received against purchase orders',
    icon: <Truck className="h-5 w-5" />,
    action: () => router.push('/purchase-orders'),
  },
  {
    label: 'Stock Position',
    description: 'Review current stock levels (read only)',
    icon: <Columns className="h-5 w-5" />,
    action: () => router.push('/stock'),
  },
  {
    label: 'Ingredient Movement',
    description: 'View movement history (read only)',
    icon: <RefreshCw className="h-5 w-5" />,
    action: () => router.push('/ingredient-movement'),
  },
  {
    label: 'Recipes (Read only)',
    description: 'Browse approved recipes and portions',
    icon: <Leaf className="h-5 w-5" />,
    action: () => router.push('/recipes'),
  },
  {
    label: 'Ingredients (Read only)',
    description: 'Check ingredient specifications',
    icon: <PackageSearch className="h-5 w-5" />,
    action: () => router.push('/ingredients'),
  },
];

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'default',
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: 'default' | 'warning' | 'success';
}) {
  const classes = {
    default: 'bg-slate-50 border-slate-200 text-slate-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  } as const;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${classes[tone]}`}>
      <div className="rounded-lg bg-white/70 p-2 text-slate-600 shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/staff/dashboard', { cache: 'no-store' });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to load staff dashboard');
        }
        const json = (await response.json()) as StaffDashboardData;
        setData(json);
      } catch (err) {
        console.error('Staff dashboard load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const actions = quickActions(router);

  return (
    <StaffOnly fallback={null}>
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Workspace</p>
          <h1 className="text-2xl font-bold text-slate-900">Operations Hub</h1>
          <p className="text-sm text-slate-500">
            Everything you need for day-to-day inventory tasks in a single place.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading staff dashboard…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Ingredients"
                value={data.summary.totalIngredients}
                subtitle="Items tracked"
                icon={<PackageSearch className="h-5 w-5" />}
              />
              <SummaryCard
                title="Low stock alerts"
                value={data.summary.lowStockCount}
                subtitle="Requires follow-up"
                icon={<ShieldCheck className="h-5 w-5" />}
                tone={data.summary.lowStockCount > 0 ? 'warning' : 'default'}
              />
              <SummaryCard
                title="Active recipes"
                value={data.summary.activeRecipes}
                subtitle="Read-only access"
                icon={<Leaf className="h-5 w-5" />}
              />
              <SummaryCard
                title="Open POs"
                value={data.summary.openPurchaseOrders}
                subtitle={`${data.summary.pendingIntends} intends in progress`}
                icon={<ClipboardList className="h-5 w-5" />}
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <SectionHeader title="Quick actions" description="Start or review a task" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="rounded-lg bg-white p-2 text-slate-600 shadow-sm">{action.icon}</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{action.label}</div>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <SectionHeader title="Pending intends" description="Track requests awaiting fulfilment" />
              <div className="mt-4 space-y-2">
                {data.pendingIntends.length === 0 ? (
                  <EmptyState message="No pending intends at the moment." />
                ) : (
                  data.pendingIntends.map((intend) => (
                    <div
                      key={intend.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{intend.intend_number}</p>
                        <p className="text-xs text-slate-500">
                          Raised {new Date(intend.created_at).toLocaleString()} • {intend.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/intends/${intend.id}`)}
                        className="self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        View details
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <SectionHeader title="Low stock alerts" description="Monitor items nearing minimum levels" />
              <div className="mt-4 space-y-2">
                {data.lowStockItems.length === 0 ? (
                  <EmptyState message="No low stock items detected." />
                ) : (
                  data.lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.stock_quantity} {item.unit} • Min {item.min_stock_level} {item.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push('/stock')}
                        className="self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        View stock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <SectionHeader title="Recent receipts" description="Goods received and logged" />
                <div className="mt-4 space-y-2">
                  {data.recentReceipts.length === 0 ? (
                    <EmptyState message="No recent receipts." />
                  ) : (
                    data.recentReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{receipt.grn_number}</p>
                            <p className="text-xs text-slate-500">PO {receipt.po_number || '—'}</p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {receipt.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Received {new Date(receipt.received_date).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <SectionHeader
                  title="Recent ingredient movement"
                  description="Read-only feed of latest stock movements"
                />
                <div className="mt-4 space-y-2">
                  {data.recentMovements.length === 0 ? (
                    <EmptyState message="No recent ingredient movements." />
                  ) : (
                    data.recentMovements.map((movement) => (
                      <div
                        key={movement.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {movement.ingredient_name || 'Ingredient'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {movement.quantity} {movement.ingredient_unit || ''} • {movement.movement_type}
                            </p>
                          </div>
                          <ShoppingBag className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(movement.movement_date).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </StaffOnly>
  );
}
