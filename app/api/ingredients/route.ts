import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Ingredient } from '@/types';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, unit, current_stock, min_stock } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (
      typeof current_stock !== 'number' ||
      typeof min_stock !== 'number' ||
      current_stock < 0 ||
      min_stock < 0
    ) {
      return NextResponse.json(
        { error: 'current_stock and min_stock must be non-negative numbers' },
        { status: 400 }
      );
    }

    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      return NextResponse.json(
        { error: 'Unit is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        name: name.trim(),
        unit: unit.trim(),
        current_stock,
        min_stock,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating ingredient:', error);
      return NextResponse.json(
        { error: 'Failed to create ingredient' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

