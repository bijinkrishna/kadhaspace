import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/sales/[id] - Get single sale with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          id,
          quantity,
          selling_price,
          cost_per_portion,
          total_revenue,
          total_cost,
          profit,
          recipes (
            id,
            name,
            category,
            portion_size
          )
        ),
        production_consumption (
          id,
          quantity_consumed,
          unit,
          cost_per_unit,
          total_cost,
          ingredients (
            id,
            name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sale, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/[id] - Delete sale (only if not processed)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if sale is processed
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('status')
      .eq('id', id)
      .single();

    if (saleError) throw saleError;

    if (sale?.status === 'processed') {
      return NextResponse.json(
        { error: 'Cannot delete processed sale' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Sale deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale', message: error.message },
      { status: 500 }
    );
  }
}


