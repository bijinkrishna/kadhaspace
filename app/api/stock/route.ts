import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('📦 Stock API called');

    // Query ingredients table directly
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*') // Select ALL columns to see what's there
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ API Error:', error);
      throw error;
    }

    // Log what we got
    console.log('✅ Fetched ingredients:', ingredients?.length);
    if (ingredients && ingredients.length > 0) {
      console.log('Sample ingredient columns:', Object.keys(ingredients[0]));
      console.log('First ingredient stock_quantity:', ingredients[0].stock_quantity);
    }

    // Return with no-cache headers
    return NextResponse.json(ingredients || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('❌ Stock API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stock',
        message: error.message,
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
