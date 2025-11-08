'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '@/lib/formatNumber';

type Row = { month: string; category_code: string; category_name: string; total: number };

export default function OpexTile() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/expenses/opex-summary');
        if (!res.ok) {
          throw new Error('Failed to fetch operating expense summary');
        }
        const json = await res.json();
        setRows(json.data || []);
      } catch (error) {
        console.error('Error loading operating expense summary:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byMonth = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const m = r.month.slice(0, 10);
      map.set(m, [...(map.get(m) || []), r]);
    });
    return map;
  }, [rows]);

  const months = Array.from(byMonth.keys()).sort().reverse();
  const current = months[0];
  const previous = months[1];

  const sum = (arr: Row[]) => arr.reduce((a, b) => a + Number(b.total || 0), 0);
  const curTotal = current ? sum(byMonth.get(current)!) : 0;
  const prevTotal = previous ? sum(byMonth.get(previous)!) : 0;
  const delta = curTotal - prevTotal;
  const deltaPct = prevTotal > 0 ? (delta / prevTotal) * 100 : 0;

  if (loading) {
    return (
      <div className="p-4 border rounded bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading Operating Expenses…</div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-600 dark:text-gray-400">Operating Expenses</div>
      <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
        ₹{formatNumber(curTotal)}
      </div>
      <div
        className={`text-xs mt-1 ${
          delta >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}
      >
        {delta >= 0 ? '+' : ''}
        {formatNumber(delta)} ({Math.round(deltaPct)}%) vs last month
      </div>
      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        Top categories this month:
      </div>
      <ul className="mt-1 text-sm">
        {current ? (
          byMonth
            .get(current)!
            .sort((a, b) => Number(b.total) - Number(a.total))
            .slice(0, 3)
            .map((r) => (
              <li key={r.category_code} className="flex justify-between text-gray-900 dark:text-gray-100">
                <span>{r.category_name}</span>
                <span>₹{formatNumber(r.total)}</span>
              </li>
            ))
        ) : (
          <li className="text-gray-400 dark:text-gray-500">No data</li>
        )}
      </ul>
    </div>
  );
}


