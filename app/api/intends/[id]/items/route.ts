import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { IntendItem, Ingredient } from '@/types';
import { validateItemDeletable } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify intend exists
    const { data: intend, error: intendError } = await supabase
      .from('intends')
      .select('id')
      .eq('id', id)
      .single();

    if (intendError || !intend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('intend_items')
      .select(`
        *,
        ingredients (*)
      `)
      .eq('intend_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching intend items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch intend items' },
        { status: 500 }
      );
    }

    // Transform data to include ingredient
    const transformedData = data?.map((item) => ({
      ...item,
      ingredient: item.ingredients || null,
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ingredient_id, quantity } = body;

    // Verify intend exists
    const { data: intend, error: intendError } = await supabase
      .from('intends')
      .select('id')
      .eq('id', id)
      .single();

    if (intendError || !intend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!ingredient_id || typeof ingredient_id !== 'string') {
      return NextResponse.json(
        { error: 'ingredient_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity must be a positive number' },
        { status: 400 }
      );
    }

    // Verify ingredient exists
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('id', ingredient_id)
      .single();

    if (ingredientError || !ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 400 }
      );
    }

    // Check if ingredient already exists in this intend
    const { data: existingItem, error: checkError } = await supabase
      .from('intend_items')
      .select('id')
      .eq('intend_id', id)
      .eq('ingredient_id', ingredient_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error('Error checking existing item:', checkError);
      return NextResponse.json(
        { error: 'Failed to check for existing item' },
        { status: 500 }
      );
    }

    if (existingItem) {
      return NextResponse.json(
        { error: 'Ingredient already exists in this intend' },
        { status: 400 }
      );
    }

    // Insert the item
    const { data, error } = await supabase
      .from('intend_items')
      .insert({
        intend_id: id,
        ingredient_id,
        quantity,
      })
      .select(`
        *,
        ingredients (*)
      `)
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505' || error.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'Ingredient already exists in this intend' },
          { status: 400 }
        );
      }
      console.error('Error creating intend item:', error);
      return NextResponse.json(
        { error: 'Failed to create intend item' },
        { status: 500 }
      );
    }

    // Transform data to include ingredient
    const transformedData = {
      ...data,
      ingredient: data.ingredients || null,
    };

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { item_id, quantity } = body;

    // Validate required fields
    if (!item_id || typeof item_id !== 'string') {
      return NextResponse.json(
        { error: 'item_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity must be a positive number' },
        { status: 400 }
      );
    }

    // Verify intend exists
    const { data: intend, error: intendError } = await supabase
      .from('intends')
      .select('id')
      .eq('id', id)
      .single();

    if (intendError || !intend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Verify item exists and belongs to this intend
    const { data: existingItem, error: itemError } = await supabase
      .from('intend_items')
      .select('id, intend_id')
      .eq('id', item_id)
      .single();

    if (itemError || !existingItem) {
      return NextResponse.json(
        { error: 'Intend item not found' },
        { status: 404 }
      );
    }

    if (existingItem.intend_id !== id) {
      return NextResponse.json(
        { error: 'Item does not belong to this intend' },
        { status: 400 }
      );
    }

    // Update the item
    const { data, error } = await supabase
      .from('intend_items')
      .update({ quantity })
      .eq('id', item_id)
      .select(`
        *,
        ingredients (*)
      `)
      .single();

    if (error) {
      console.error('Error updating intend item:', error);
      return NextResponse.json(
        { error: 'Failed to update intend item' },
        { status: 500 }
      );
    }

    // Transform data to include ingredient
    const transformedData = {
      ...data,
      ingredient: data.ingredients || null,
    };

    return NextResponse.json(transformedData);
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
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id query parameter is required' },
        { status: 400 }
      );
    }

    // Verify intend exists
    const { data: intend, error: intendError } = await supabase
      .from('intends')
      .select('id')
      .eq('id', id)
      .single();

    if (intendError || !intend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Verify item exists and belongs to this intend
    const { data: existingItem, error: itemError } = await supabase
      .from('intend_items')
      .select('id, intend_id')
      .eq('id', item_id)
      .single();

    if (itemError || !existingItem) {
      return NextResponse.json(
        { error: 'Intend item not found' },
        { status: 404 }
      );
    }

    if (existingItem.intend_id !== id) {
      return NextResponse.json(
        { error: 'Item does not belong to this intend' },
        { status: 400 }
      );
    }

    // Fetch the item with PO info to validate deletion
    const { data: itemWithPO, error: itemPOError } = await supabase
      .from('intend_items')
      .select(`
        *,
        po_items (
          id,
          purchase_orders (
            id,
            po_number
          )
        )
      `)
      .eq('id', item_id)
      .single();

    if (itemPOError) {
      console.error('Error fetching item with PO info:', itemPOError);
      return NextResponse.json(
        { error: 'Failed to fetch item details' },
        { status: 500 }
      );
    }

    // Get PO number if item is linked to a PO
    const poInfo = itemWithPO?.po_items?.[0]?.purchase_orders
      ? { po_number: itemWithPO.po_items[0].purchase_orders.po_number }
      : null;

    const itemForValidation = {
      ...itemWithPO,
      po_info: poInfo,
    };

    // Validate if item is deletable
    const validationResult = validateItemDeletable(itemForValidation);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 403 }
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from('intend_items')
      .delete()
      .eq('id', item_id);

    if (deleteError) {
      console.error('Error deleting intend item:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete intend item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Intend item deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

