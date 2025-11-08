import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch the most recent unit_price for each ingredient from po_items
    // Get the latest unit_price per ingredient from the most recent PO item
    const { data: lastPrices, error } = await supabase
      .from('po_items')
      .select('ingredient_id, unit_price, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching last prices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch last prices' },
        { status: 500 }
      );
    }

    // Group by ingredient_id and get the most recent price for each
    const priceMap: Record<string, number> = {};
    
    if (lastPrices) {
      for (const item of lastPrices) {
        if (item.ingredient_id && item.unit_price > 0) {
          // Only set if not already set (since data is ordered by created_at desc)
          if (!priceMap[item.ingredient_id]) {
            priceMap[item.ingredient_id] = item.unit_price;
          }
        }
      }
    }

    return NextResponse.json(priceMap);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






