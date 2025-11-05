import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: grn, error: grnError } = await supabase
      .from('grns')
      .select('id, grn_number, po_id, received_date, received_by, notes, status')
      .eq('id', id)
      .single();

    if (grnError) {
      if (grnError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'GRN not found' },
          { status: 404 }
        );
      }
      throw grnError;
    }

    return NextResponse.json(grn);
  } catch (error: any) {
    console.error('Error fetching GRN:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GRN', details: error.message },
      { status: 500 }
    );
  }
}





