import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest) {
  try {
    // Get first day of last month for comparison (current month + last month)
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from('v_operating_expense_summary')
      .select('*')
      .gte('month', lastMonthStart)
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching operating expense summary:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Apply 0 decimal policy - round all totals to whole numbers
    const processedData = (data || []).map((row: any) => ({
      ...row,
      total: Math.round(Number(row.total || 0)),
    }));

    return NextResponse.json(
      { data: processedData },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error fetching operating expense summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operating expense summary', message: error.message },
      { status: 500 }
    );
  }
}


