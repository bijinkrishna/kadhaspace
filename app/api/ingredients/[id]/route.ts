import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Ingredient } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Ingredient not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching ingredient:', error);
      throw error;
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredient' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, unit, current_stock, min_stock } = body;

    // Check if ingredient exists
    const { data: existingIngredient, error: fetchError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingIngredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Partial<Ingredient> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (unit !== undefined) {
      if (typeof unit !== 'string' || unit.trim() === '') {
        return NextResponse.json(
          { error: 'Unit must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.unit = unit.trim();
    }

    if (current_stock !== undefined) {
      if (typeof current_stock !== 'number' || current_stock < 0) {
        return NextResponse.json(
          { error: 'current_stock must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.current_stock = current_stock;
    }

    if (min_stock !== undefined) {
      if (typeof min_stock !== 'number' || min_stock < 0) {
        return NextResponse.json(
          { error: 'min_stock must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.min_stock = min_stock;
    }

    const { data, error } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating ingredient:', error);
      return NextResponse.json(
        { error: 'Failed to update ingredient' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if ingredient exists
    const { data: existingIngredient, error: fetchError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingIngredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    // Check if ingredient is referenced in intend_items
    const { data: intendItems, error: checkError } = await supabase
      .from('intend_items')
      .select('id')
      .eq('ingredient_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking intend_items:', checkError);
      return NextResponse.json(
        { error: 'Failed to check ingredient references' },
        { status: 500 }
      );
    }

    if (intendItems && intendItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete ingredient that is part of an intend' },
        { status: 400 }
      );
    }

    // Delete the ingredient
    const { error: deleteError } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting ingredient:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete ingredient' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

