'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AttendanceStatus = 'present' | 'absent' | 'late';

type AttendanceRecord = {
  id: string;
  status: AttendanceStatus;
  attn_date: string;
  marked_at: string;
  marked_by?: string | null;
};

type StaffRow = {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  attendance: AttendanceRecord | null;
};

type AttendanceSummary = {
  totalStaff: number;
  activeStaff: number;
  marked: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
};

type HKRow = {
  id: string;
  task_id: string;
  work_date: string;
  planned_start: string;
  planned_end: string;
  status: string;
  is_markable_now: boolean;
  task?: {
    name: string;
    area: string;
  } | null;
};

const formatTimeRange = (start: string, end: string) => {
  const format = (value: string) =>
    value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
  return `${format(start)} – ${format(end)}`;
};

export default function ManagerOpsPage() {
  const [tab, setTab] = useState<'attendance' | 'housekeeping'>('attendance');

  return (
    <div className="space-y-6 bg-gray-50 p-6 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manager Workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Operations Control Centre</h1>
        <p className="mt-2 text-sm text-slate-600">
          Mark staff attendance and monitor today’s housekeeping schedule in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('attendance')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'attendance'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Attendance
        </button>
        <button
          type="button"
          onClick={() => setTab('housekeeping')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'housekeeping'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Housekeeping
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {tab === 'attendance' ? <AttendancePanel /> : <HousekeepingPanel />}
      </div>
    </div>
  );
}

function AttendancePanel() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [updating, setUpdating] = useState<string | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/attendance?date=${date}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to fetch attendance');
      }
      const json = await res.json();
      setRows(json.rows || []);
      setSummary(json.summary || null);
    } catch (err: any) {
      console.error('Error loading attendance:', err);
      setError(err.message || 'Unable to load attendance');
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const mark = useCallback(
    async (staffId: string, status: AttendanceStatus) => {
      try {
        setUpdating(staffId);
        const res = await fetch('/api/manager/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId, status, attn_date: date }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to mark attendance');
        }
        await load();
      } catch (err) {
        console.error('Error marking attendance:', err);
        // surface minimal feedback; eslint-disable-next-line no-alert
        alert(err instanceof Error ? err.message : 'Failed to mark attendance');
      } finally {
        setUpdating(null);
      }
    },
    [date, load]
  );

  const actionDisabled = useMemo(() => !!updating, [updating]);

  const renderStatusBadge = (status: AttendanceStatus | undefined | null) => {
    if (!status) {
      return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Unmarked</span>;
    }

    const base = 'rounded-full px-2 py-0.5 text-xs font-semibold';
    switch (status) {
      case 'present':
        return <span className={`${base} bg-emerald-100 text-emerald-700`}>Present</span>;
      case 'late':
        return <span className={`${base} bg-amber-100 text-amber-700`}>Late</span>;
      case 'absent':
      default:
        return <span className={`${base} bg-rose-100 text-rose-700`}>Absent</span>;
    }
  };

  const summaryCards = summary
    ? [
        {
          label: 'Total Staff',
          value: summary.totalStaff,
          sub: `${summary.activeStaff} active`,
        },
        {
          label: 'Marked Today',
          value: summary.marked,
          sub: `${summary.unmarked} pending`,
        },
        {
          label: 'Present',
          value: summary.present,
          tone: 'text-emerald-600',
          sub: summary.late > 0 ? `${summary.late} late` : undefined,
        },
        {
          label: 'Absent',
          value: summary.absent,
          tone: 'text-rose-600',
          sub: summary.unmarked > 0 ? `${summary.unmarked} unmarked` : undefined,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold uppercase text-slate-500">Date</label>
        <input
          type="date"
          value={date}
          onChange={event => setDate(event.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={load}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryCards.map(card => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className={`mt-1 text-xl font-bold text-slate-900 ${card.tone || ''}`}>
                {card.value}
              </p>
              {card.sub && <p className="text-xs text-slate-500">{card.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading attendance…</p>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Marked At</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {rows.map(row => (
                <tr key={row.id} className={!row.is_active ? 'bg-slate-50' : ''}>
                  <td className="px-4 py-3 font-medium">
                    <span className={row.is_active ? '' : 'text-slate-400 line-through'}>
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{row.role.replace('_', ' ')}</td>
                  <td className="px-4 py-3 align-middle">{renderStatusBadge(row.attendance?.status)}</td>
                  <td className="px-4 py-3">
                    {row.attendance?.marked_at
                      ? new Date(row.attendance.marked_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(['present', 'late', 'absent'] as AttendanceStatus[]).map(status => (
                        <button
                          key={status}
                          type="button"
                          disabled={!row.is_active || (actionDisabled && updating !== row.id)}
                          onClick={() => mark(row.id, status)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : status === 'late'
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-rose-500 text-white hover:bg-rose-600'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm font-medium text-slate-400"
                  >
                    No active staff found for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HousekeepingPanel() {
  const [rows, setRows] = useState<HKRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/manager/hk/today');
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to fetch housekeeping tasks');
      }
      const json = await res.json();
      setRows(json.rows || []);
    } catch (err: any) {
      console.error('Error loading housekeeping tasks:', err);
      setError(err.message || 'Unable to load housekeeping tasks');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mark = useCallback(
    async (instanceId: string, completed: boolean) => {
      try {
        setUpdatingId(instanceId);
        const res = await fetch('/api/manager/hk/mark', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instance_id: instanceId, completed }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to update housekeeping task');
        }
        await load();
      } catch (err) {
        console.error('Error updating housekeeping task:', err);
        // eslint-disable-next-line no-alert
        alert(err instanceof Error ? err.message : 'Failed to update housekeeping task');
      } finally {
        setUpdatingId(null);
      }
    },
    [load]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">Today’s markable tasks</p>
        <button
          type="button"
          onClick={load}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading housekeeping entries…</p>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {rows.map(row => {
                const overdue =
                  !row.is_markable_now &&
                  row.status !== 'completed' &&
                  row.planned_end &&
                  new Date(row.planned_end) < new Date();
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">
                      {row.task?.name || 'Unnamed task'}
                    </td>
                    <td className="px-4 py-3">{row.task?.area || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatTimeRange(row.planned_start, row.planned_end)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                        {row.status || 'unknown'}
                      </span>
                      {row.is_markable_now && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Open
                        </span>
                      )}
                      {overdue && (
                        <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!row.is_markable_now || updatingId === row.id}
                        onClick={() => mark(row.id, true)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          row.is_markable_now
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-slate-100 text-slate-500'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {updatingId === row.id ? 'Saving…' : 'Mark done'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm font-medium text-slate-400"
                  >
                    No markable housekeeping tasks for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

