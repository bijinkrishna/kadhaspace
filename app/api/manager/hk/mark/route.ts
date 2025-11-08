import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  const { instance_id, completed, remarks, supervisor } = await req.json();

  const instance = await supabase
    .from('hk_instances_markable')
    .select('id, is_markable_now')
    .eq('id', instance_id)
    .maybeSingle();

  if (instance.error) {
    return NextResponse.json({ error: instance.error.message }, { status: 500 });
  }

  if (!instance.data) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
  }

  if (!instance.data.is_markable_now) {
    return NextResponse.json({ error: 'Window closed; task is overdue' }, { status: 400 });
  }

  const payload = {
    instance_id,
    completed: Boolean(completed),
    completion_status: completed ? 'on_time' : 'skipped',
    completed_at: new Date().toISOString(),
    remarks: remarks || null,
    supervisor: supervisor || 'manager',
  };

  const completion = await supabase
    .from('hk_completions')
    .upsert(payload, { onConflict: 'instance_id' })
    .select()
    .single();

  if (completion.error) {
    return NextResponse.json({ error: completion.error.message }, { status: 500 });
  }

  const statusUpdate = await supabase
    .from('hk_instances')
    .update({ status: completed ? 'completed' : 'skipped' })
    .eq('id', instance_id);

  if (statusUpdate.error) {
    return NextResponse.json({ error: statusUpdate.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}



