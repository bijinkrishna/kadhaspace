'use client';

import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';

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

const formatTime = (value: string) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

const formatTimeRange = (start: string, end: string) => `${formatTime(start)} – ${formatTime(end)}`;

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

  const renderActionButtons = (row: StaffRow) => (
    <div className="flex flex-wrap gap-2">
      {(['present', 'late', 'absent'] as AttendanceStatus[]).map((status) => (
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
  );

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
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-100 md:block">
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
                {rows.map((row) => (
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
                    <td className="px-4 py-3">{renderActionButtons(row)}</td>
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

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
                  row.is_active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{row.name}</div>
                    <div className="text-xs capitalize text-slate-500">
                      {row.role.replace('_', ' ')}
                    </div>
                    {!row.is_active && (
                      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-rose-500">
                        Inactive
                      </div>
                    )}
                  </div>
                  {renderStatusBadge(row.attendance?.status)}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Marked at</span>
                    <span className="text-slate-700">
                      {row.attendance?.marked_at
                        ? new Date(row.attendance.marked_at).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  {row.attendance?.marked_by && (
                    <div className="flex items-center justify-between">
                      <span>Marked by</span>
                      <span className="text-slate-700">{row.attendance.marked_by}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {renderActionButtons(row)}
                  {!row.is_active && (
                    <p className="text-xs text-slate-400">
                      Reactivate this staff member to mark attendance.
                    </p>
                  )}
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">
                No active staff found for this date.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HousekeepingPanel() {
  const [rows, setRows] = useState<HKRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const now = new Date();

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

  const statusBadgeStyles: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    scheduled: 'bg-slate-100 text-slate-600',
    missed: 'bg-rose-100 text-rose-700',
    skipped: 'bg-rose-100 text-rose-700',
  };

  const viewRows = rows.map((row) => {
    const plannedStart = row.planned_start ? new Date(row.planned_start) : null;
    const plannedEnd = row.planned_end ? new Date(row.planned_end) : null;
    const isCompleted = row.status === 'completed';
    const isSkipped = row.status === 'skipped';
    const isWindowOpen = row.is_markable_now && !isCompleted;
    const isFuture = plannedStart ? plannedStart > now : false;
    const isOverdue = !isWindowOpen && !isCompleted && plannedEnd ? plannedEnd < now : false;

    const windowLabel = plannedEnd
      ? plannedEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';
    const startLabel = plannedStart
      ? plannedStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';
    const rangeLabel = formatTimeRange(row.planned_start, row.planned_end);

    const doneLabel = isCompleted ? 'Completed' : 'Mark done';
    const notDoneLabel = isSkipped ? 'Marked not done' : 'Mark not done';

    const doneDisabled = isCompleted || !isWindowOpen || updatingId === row.id;
    const notDoneDisabled = isSkipped || !isWindowOpen || updatingId === row.id;

    const supportText =
      !isWindowOpen && !isCompleted && !isSkipped
        ? isFuture
          ? `Window opens at ${formatTime(row.planned_start)}`
          : 'Window has closed for this task.'
        : null;

    const statusClass = statusBadgeStyles[row.status || 'scheduled'] || 'bg-slate-100 text-slate-600';

    return {
      data: row,
      plannedStart,
      plannedEnd,
      isCompleted,
      isSkipped,
      isWindowOpen,
      isFuture,
      isOverdue,
      windowLabel,
      startLabel,
      rangeLabel,
      doneLabel,
      notDoneLabel,
      doneDisabled,
      notDoneDisabled,
      supportText,
      statusClass,
    };
  });

  const summary = useMemo(() => {
    const total = viewRows.length;
    const completed = viewRows.filter((viewRow) => viewRow.isCompleted).length;
    const skipped = viewRows.filter((viewRow) => viewRow.isSkipped).length;
    const missed = viewRows.filter(
      (viewRow) => viewRow.isOverdue && !viewRow.isCompleted && !viewRow.isSkipped
    ).length;
    const upcoming = viewRows.filter((viewRow) => viewRow.isFuture || viewRow.isWindowOpen).length;

    return {
      total,
      completed,
      skipped,
      missed,
      upcoming,
    };
  }, [viewRows]);

  const renderTaskCard = (
    viewRow: (typeof viewRows)[number],
    variant: 'mobile' | 'desktop'
  ): ReactElement => {
    const buttonBase =
      variant === 'mobile'
        ? 'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition'
        : 'rounded-full px-3 py-1.5 text-xs font-semibold transition';
    const positiveTone = viewRow.isWindowOpen
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : 'bg-slate-100 text-slate-400';
    const negativeTone = viewRow.isWindowOpen
      ? 'bg-rose-600 text-white hover:bg-rose-700'
      : 'bg-slate-100 text-slate-400';
    const metaGrid =
      variant === 'mobile'
        ? 'grid grid-cols-2 gap-3 text-xs text-slate-500'
        : 'grid grid-cols-3 gap-3 text-xs text-slate-500';

    return (
      <div
        key={`${viewRow.data.id}-${variant}`}
        className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {viewRow.data.task?.name || 'Unnamed task'}
            </div>
            <div className="text-xs text-slate-500">{viewRow.data.task?.area || '—'}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${viewRow.statusClass}`}
            >
              {(viewRow.data.status || 'scheduled').replace('_', ' ')}
            </span>
            {viewRow.isWindowOpen && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Window open
              </span>
            )}
            {viewRow.isFuture && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Opens soon
              </span>
            )}
            {viewRow.isOverdue && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                Window closed
              </span>
            )}
          </div>
        </div>

        <div className={metaGrid}>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-600">Start</p>
            <p className="mt-1 text-slate-700">{viewRow.startLabel}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-600">Due</p>
            <p className="mt-1 text-slate-700">{viewRow.windowLabel}</p>
          </div>
          {variant === 'desktop' && (
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-600">Window</p>
              <p className="mt-1 text-slate-700">{viewRow.rangeLabel}</p>
            </div>
          )}
        </div>

        {variant === 'mobile' && (
          <div className="text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide text-slate-600">Window</p>
            <p className="mt-1 text-slate-700">{viewRow.rangeLabel}</p>
          </div>
        )}

        <div className={`mt-auto flex flex-col gap-2 ${variant === 'mobile' ? '' : 'lg:gap-3'}`}>
          <div className={`flex gap-2 ${variant === 'mobile' ? 'flex-col sm:flex-row' : ''}`}>
            <button
              type="button"
              disabled={viewRow.doneDisabled}
              onClick={() => mark(viewRow.data.id, true)}
              className={`${buttonBase} ${positiveTone} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {updatingId === viewRow.data.id && !viewRow.doneDisabled ? 'Saving…' : viewRow.doneLabel}
            </button>
            <button
              type="button"
              disabled={viewRow.notDoneDisabled}
              onClick={() => mark(viewRow.data.id, false)}
              className={`${buttonBase} ${negativeTone} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {updatingId === viewRow.data.id && !viewRow.notDoneDisabled
                ? 'Saving…'
                : viewRow.notDoneLabel}
            </button>
          </div>
          {viewRow.supportText && <p className="text-xs text-slate-400">{viewRow.supportText}</p>}
        </div>
      </div>
    );
  };

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

      {!loading && !error && summary.total > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Completed</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.completed}</p>
            <p className="text-xs text-slate-500">{summary.total - summary.completed} remaining</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Upcoming / Open</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.upcoming}</p>
            <p className="text-xs text-slate-500">Stay on schedule and verify each task</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Missed / Not Done</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">{summary.missed + summary.skipped}</p>
            <p className="text-xs text-slate-500">
              {summary.skipped} marked not done • {summary.missed} window(s) missed
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading housekeeping entries…</p>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : viewRows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">
          No markable housekeeping tasks for today.
        </div>
      ) : (
        <>
          <div className="hidden md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {viewRows.map((viewRow) => renderTaskCard(viewRow, 'desktop'))}
          </div>
          <div className="space-y-3 md:hidden">
            {viewRows.map((viewRow) => renderTaskCard(viewRow, 'mobile'))}
          </div>
        </>
      )}
    </div>
  );
}

