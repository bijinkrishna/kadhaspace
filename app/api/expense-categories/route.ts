import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
      throw error;
    }

    return NextResponse.json(
      { data: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense categories', message: error.message },
      { status: 500 }
    );
  }
}


