import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface TaskSeed {
  code: string;
  name: string;
  area: string;
  deadlineHour: number;
  windowMinutes: number;
}

const SEED_TASKS: TaskSeed[] = [
  {
    code: 'HK-1100',
    name: 'Morning Service Reset',
    area: 'Dining',
    deadlineHour: 11,
    windowMinutes: 60,
  },
  {
    code: 'HK-1500',
    name: 'Afternoon Beverage Prep',
    area: 'Pantry',
    deadlineHour: 15,
    windowMinutes: 60,
  },
  {
    code: 'HK-1900',
    name: 'Evening Table Turnaround',
    area: 'Dining',
    deadlineHour: 19,
    windowMinutes: 90,
  },
  {
    code: 'HK-2300',
    name: 'Closing Equipment Shutdown',
    area: 'Kitchen',
    deadlineHour: 23,
    windowMinutes: 90,
  },
];

function getTodayISODate() {
  return new Date().toISOString().split('T')[0];
}

function toISODateTime(date: string, hour: number, minute = 0) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export async function POST() {
  try {
    const workDate = getTodayISODate();
    const created: any[] = [];
    const errors: string[] = [];

    for (const task of SEED_TASKS) {
      // Ensure task catalog entry
      const { data: existingTask, error: findTaskError } = await supabase
        .from('hk_task_catalog')
        .select('id, name')
        .eq('name', task.name)
        .maybeSingle();

      if (findTaskError) {
        errors.push(`Failed to fetch task ${task.code}: ${findTaskError.message}`);
        continue;
      }

      let taskId = existingTask?.id;

      if (!taskId) {
        const { data: createdTask, error: createTaskError } = await supabase
          .from('hk_task_catalog')
          .insert({
            name: task.name,
            area: task.area,
            description: `${task.name} (auto-seeded ${task.code})`,
            is_active: true,
          })
          .select('id')
          .single();

        if (createTaskError) {
          errors.push(`Failed to create task ${task.code}: ${createTaskError.message}`);
          continue;
        }

        taskId = createdTask.id;
      }

      // Remove any existing instance for this task/date to avoid duplicates
      const { error: deleteError } = await supabase
        .from('hk_instances')
        .delete()
        .eq('task_id', taskId)
        .eq('work_date', workDate);

      if (deleteError) {
        errors.push(`Failed to reset previous instance for ${task.code}: ${deleteError.message}`);
        continue;
      }

      const windowMinutes = Math.max(task.windowMinutes, 30);
      const startHour = Math.max(task.deadlineHour - Math.ceil(windowMinutes / 60), 0);
      const startMinute = Math.max(60 - windowMinutes, 0) % 60;

      const plannedStart = toISODateTime(workDate, startHour, startMinute);
      const plannedEnd = toISODateTime(workDate, task.deadlineHour, 0);

      const { data: instance, error: insertInstanceError } = await supabase
        .from('hk_instances')
        .insert({
          task_id: taskId,
          work_date: workDate,
          planned_start: plannedStart,
          planned_end: plannedEnd,
          status: 'scheduled',
        })
        .select('id, task_id, work_date, planned_start, planned_end')
        .single();

      if (insertInstanceError) {
        errors.push(`Failed to create instance for ${task.code}: ${insertInstanceError.message}`);
        continue;
      }

      created.push({
        code: task.code,
        task_id: instance.task_id,
        work_date: instance.work_date,
        planned_start: instance.planned_start,
        planned_end: instance.planned_end,
      });
    }

    return NextResponse.json(
      {
        success: errors.length === 0,
        created,
        errors,
      },
      {
        status: errors.length > 0 ? 207 : 200,
      },
    );
  } catch (error: any) {
    console.error('Error seeding housekeeping tasks:', error);
    return NextResponse.json(
      { error: 'Failed to seed housekeeping tasks', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}


