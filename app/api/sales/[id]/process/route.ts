import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/sales/[id]/process - Process sale and update stock
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Call the database function to process the sale
    const { error } = await supabase.rpc('process_sale', {
      p_sale_id: id
    });

    if (error) throw error;

    console.log('✅ Sale processed:', id);

    return NextResponse.json({
      success: true,
      message: 'Sale processed and stock updated successfully'
    });

  } catch (error: any) {
    console.error('Error processing sale:', error);
    return NextResponse.json(
      { error: 'Failed to process sale', message: error.message },
      { status: 500 }
    );
  }
}



