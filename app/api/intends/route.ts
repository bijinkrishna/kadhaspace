import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch intends with vendors
    const { data: intendsData, error: intendsError } = await supabase
      .from('intends')
      .select(`
        *,
        vendors (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (intendsError) {
      console.error('Error fetching intends:', intendsError);
      return NextResponse.json(
        { error: 'Failed to fetch intends' },
        { status: 500 }
      );
    }

    if (!intendsData || intendsData.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate item counts for each intend by checking po_items.intend_item_id
    const intendsWithCounts = await Promise.all(
      intendsData.map(async (intend) => {
        // Total items count
        const { count: totalItems } = await supabase
          .from('intend_items')
          .select('*', { count: 'exact', head: true })
          .eq('intend_id', intend.id);

        // Get all intend item IDs for this intend
        const { data: intendItemIds, error: itemIdsError } = await supabase
          .from('intend_items')
          .select('id')
          .eq('intend_id', intend.id);

        if (itemIdsError) {
          console.error('Error fetching intend item IDs:', itemIdsError);
          return {
            ...intend,
            vendor_name: intend.vendors?.name || null,
            vendor: intend.vendors || null,
            total_items: 0,
            items_in_po: 0,
            status: 'pending' as const,
          };
        }

        // Count how many of these intend items are referenced in po_items
        let itemsInPo = 0;
        if (intendItemIds && intendItemIds.length > 0) {
          const ids = intendItemIds.map(item => item.id);
          
          const { count } = await supabase
            .from('po_items')
            .select('*', { count: 'exact', head: true })
            .in('intend_item_id', ids)
            .not('intend_item_id', 'is', null);
          
          itemsInPo = count || 0;
        }

        // Determine status based on fulfillment
        let status: 'pending' | 'partially_fulfilled' | 'fulfilled';
        
        if ((totalItems || 0) === 0) {
          // No items, status is pending
          status = 'pending';
        } else if (itemsInPo === 0) {
          // Has items but none in PO yet
          status = 'pending';
        } else if (itemsInPo < (totalItems || 0)) {
          // Some items in PO but not all
          status = 'partially_fulfilled';
        } else {
          // All items in PO
          status = 'fulfilled';
        }

        return {
          ...intend,
          vendor_name: intend.vendors?.name || null,
          vendor: intend.vendors || null,
          total_items: totalItems || 0,
          items_in_po: itemsInPo,
          status,
        };
      })
    );

    return NextResponse.json(intendsWithCounts);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notes, items } = body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must contain at least one item' },
        { status: 400 }
      );
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.ingredient_id || typeof item.ingredient_id !== 'string') {
        return NextResponse.json(
          { error: `Item ${i + 1}: ingredient_id is required and must be a string` },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1}: quantity must be a positive number` },
          { status: 400 }
        );
      }
    }

    // Generate intend ID using SQL function
    const { data: intendIdData, error: intendIdError } = await supabase
      .rpc('generate_intend_id');

    if (intendIdError || !intendIdData) {
      console.error('Error generating intend ID:', intendIdError);
      const errorMessage = intendIdError?.message || 'Unknown error';
      return NextResponse.json(
        { 
          error: 'Failed to generate intend ID',
          details: errorMessage.includes('function') || errorMessage.includes('does not exist')
            ? 'The generate_intend_id() SQL function is missing. Please run supabase_generate_intend_id.sql in Supabase SQL Editor.'
            : errorMessage
        },
        { status: 500 }
      );
    }

    const generatedIntendId = intendIdData;

    // Create intend with generated ID as name
    const { data: intendData, error: intendError } = await supabase
      .from('intends')
      .insert({
        name: generatedIntendId,
        status: 'pending',
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (intendError) {
      console.error('Error creating intend:', intendError);
      return NextResponse.json(
        { error: 'Failed to create intend' },
        { status: 500 }
      );
    }

    const intendId = intendData.id;

    // Verify all ingredients exist before creating items
    const ingredientIds = items.map((item) => item.ingredient_id);
    const { data: existingIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('id')
      .in('id', ingredientIds);

    if (ingredientsError) {
      console.error('Error verifying ingredients:', ingredientsError);
      return NextResponse.json(
        { error: 'Failed to verify ingredients' },
        { status: 500 }
      );
    }

    const existingIngredientIds = existingIngredients?.map((ing) => ing.id) || [];
    const missingIngredients = ingredientIds.filter((id) => !existingIngredientIds.includes(id));
    if (missingIngredients.length > 0) {
      return NextResponse.json(
        { error: `The following ingredients were not found: ${missingIngredients.join(', ')}` },
        { status: 400 }
      );
    }

    // Create intend items
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('intend_items')
        .insert({
          intend_id: intendId,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          remarks: item.remarks || null  // Include remarks
        });
      
      if (itemError) {
        console.error('Error creating intend item:', itemError);
        // Check for duplicate ingredient error
        if (itemError.code === '23505' || itemError.message?.includes('unique')) {
          return NextResponse.json(
            { error: `Ingredient ${item.ingredient_id} already exists in this intend` },
            { status: 400 }
          );
        }
        // If error is due to missing 'remarks' column, try again without remarks
        if (itemError.message?.includes('column') && itemError.message?.includes('remarks')) {
          const { error: retryError } = await supabase
            .from('intend_items')
            .insert({
              intend_id: intendId,
              ingredient_id: item.ingredient_id,
              quantity: item.quantity,
            });
          
          if (retryError) {
            console.error('Error creating intend item (retry):', retryError);
            return NextResponse.json(
              { 
                error: 'Failed to create intend item',
                details: retryError.message 
              },
              { status: 500 }
            );
          }
          // Continue if retry succeeds (remarks column doesn't exist, which is OK)
        } else {
          throw itemError;
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Intend created successfully',
        intend: {
          id: intendData.id,
          name: intendData.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

