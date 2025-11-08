import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_STATUSES = new Set<AttendanceStatus>(['present', 'absent', 'late']);

type AttendanceStatus = 'present' | 'absent' | 'late';

function normalizeDate(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  // Ensure safe date parsing; fallback to today if invalid
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attnDate = normalizeDate(searchParams.get('date'));

    const [{ data: staffRows, error: staffError }, { data: attendanceRows, error: attendanceError }] =
      await Promise.all([
        supabase
          .from('staff')
          .select('id, name, role, is_active')
          .order('is_active', { ascending: false })
          .order('name', { ascending: true }),
        supabase
          .from('staff_attendance')
          .select('id, staff_id, attn_date, status, marked_at, marked_by')
          .eq('attn_date', attnDate),
      ]);

    if (staffError) {
      throw staffError;
    }

    if (attendanceError) {
      throw attendanceError;
    }

    const attendanceByStaff = new Map<string, any>();
    (attendanceRows || []).forEach((entry) => {
      attendanceByStaff.set(entry.staff_id, entry);
    });

    const rows = (staffRows || []).map((staff) => {
      const attendance = attendanceByStaff.get(staff.id) || null;

      return {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        is_active: staff.is_active ?? false,
        attendance: attendance
          ? {
              id: attendance.id,
              status: attendance.status as AttendanceStatus,
              attn_date: attendance.attn_date,
              marked_at: attendance.marked_at,
              marked_by: attendance.marked_by,
            }
          : null,
      };
    });

    const present = rows.filter((row) => row.attendance?.status === 'present').length;
    const absent = rows.filter((row) => row.attendance?.status === 'absent').length;
    const late = rows.filter((row) => row.attendance?.status === 'late').length;
    const marked = present + absent + late;
    const totalActive = rows.filter((row) => row.is_active).length;

    return NextResponse.json({
      date: attnDate,
      rows,
      summary: {
        totalStaff: rows.length,
        activeStaff: totalActive,
        marked,
        present,
        absent,
        late,
        unmarked: rows.length - marked,
      },
    });
  } catch (error: any) {
    console.error('Attendance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const staffId: string | undefined = body.staff_id;
    const status: string | undefined = body.status;
    const markedBy: string | undefined = body.marked_by;
    const attnDate = normalizeDate(body.attn_date);

    if (!staffId) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 });
    }

    const normalizedStatus = (status || '').toLowerCase() as AttendanceStatus;
    if (!VALID_STATUSES.has(normalizedStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be present, absent, or late.' },
        { status: 400 },
      );
    }

    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select('id, is_active')
      .eq('id', staffId)
      .maybeSingle();

    if (staffError) {
      throw staffError;
    }

    if (!staffRecord) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { data: attendance, error: upsertError } = await supabase
      .from('staff_attendance')
      .upsert(
        {
          staff_id: staffId,
          attn_date: attnDate,
          status: normalizedStatus,
          marked_at: new Date().toISOString(),
          marked_by: markedBy || 'manager',
        },
        { onConflict: 'staff_id,attn_date' },
      )
      .select('id, staff_id, attn_date, status, marked_at, marked_by')
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error: any) {
    console.error('Attendance POST error:', error);
    return NextResponse.json(
      { error: 'Failed to record attendance', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}


