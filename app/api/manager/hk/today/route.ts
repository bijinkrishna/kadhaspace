import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('hk_instances_markable')
    .select('id, task_id, work_date, planned_start, planned_end, status, is_markable_now')
    .eq('work_date', today)
    .order('planned_start', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const taskIds = (data || []).map(record => record.task_id).filter(Boolean);
  let tasksById: Record<string, { name: string; area: string }> = {};

  if (taskIds.length > 0) {
    const { data: catalog, error: catalogError } = await supabase
      .from('hk_task_catalog')
      .select('id, name, area')
      .in('id', taskIds);

    if (!catalogError && catalog) {
      tasksById = Object.fromEntries(
        catalog.map(task => [task.id, { name: task.name, area: task.area }])
      );
    }
  }

  const rows = (data || []).map(record => ({
    ...record,
    task: tasksById[record.task_id] || null,
  }));

  return NextResponse.json({ rows });
}



