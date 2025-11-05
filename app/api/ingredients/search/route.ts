import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // If query is less than 2 characters, return empty array
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search ingredients where name contains query (case-insensitive)
    // Use SQL ILIKE for case-insensitive search
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error searching ingredients:', error);
      return NextResponse.json(
        { error: 'Failed to search ingredients' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




