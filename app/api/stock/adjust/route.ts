import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adjustment_type, adjustment_date, notes, items, created_by } = body;

    // Validate
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    // Generate unique adjustment number with date + counter
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get count of adjustments today to create sequential number
    const { count } = await supabase
      .from('stock_adjustments')
      .select('*', { count: 'exact', head: true })
      .eq('adjustment_date', todayStr);

    const sequentialNumber = (count || 0) + 1;
    const dateStr = todayStr.replace(/-/g, ''); // YYYYMMDD
    const adjustmentNumber = `ADJ-${dateStr}-${String(sequentialNumber).padStart(3, '0')}`;
    // Format: ADJ-20251105-001, ADJ-20251105-002, etc.

    // Create stock adjustment
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('stock_adjustments')
      .insert({
        adjustment_number: adjustmentNumber,
        adjustment_date: adjustment_date || todayStr,
        adjustment_type,
        notes: notes || null,
        created_by: created_by || 'system',
      })
      .select()
      .single();

    if (adjustmentError) {
      // Check if it's a duplicate key error
      if (adjustmentError.code === '23505' && adjustmentError.message?.includes('adjustment_number')) {
        console.error('Duplicate adjustment number detected:', adjustmentNumber);
        return NextResponse.json(
          {
            error: 'Duplicate adjustment number',
            details: `The adjustment number ${adjustmentNumber} already exists. Please try again.`,
            hint: 'This may occur if multiple adjustments are created simultaneously. The system will retry automatically.',
          },
          { status: 409 }
        );
      }
      throw adjustmentError;
    }

    // Insert adjustment items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        adjustment_id: adjustment.id,
        ingredient_id: item.ingredient_id,
        system_quantity: item.system_quantity,
        actual_quantity: item.actual_quantity,
        remarks: item.remarks || null,
      }));

      const { error: itemsError } = await supabase
        .from('stock_adjustment_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating adjustment items:', itemsError);
        throw itemsError;
      }

      // Update ingredient stock quantities and record movements
      for (const item of items) {
        const variance = item.actual_quantity - item.system_quantity;

        // Update ingredient stock (use current_stock to match codebase)
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({ current_stock: item.actual_quantity })
          .eq('id', item.ingredient_id);

        if (updateError) {
          console.error('Error updating ingredient stock:', updateError);
          throw updateError;
        }

        // Record stock movement if there's a variance
        if (variance !== 0) {
          const { error: movementError } = await supabase.rpc('record_stock_movement', {
            p_ingredient_id: item.ingredient_id,
            p_movement_type: 'adjustment',
            p_quantity: variance,
            p_reference_type: 'adjustment',
            p_reference_id: adjustment.id,
            p_remarks: `Adjustment ${adjustmentNumber}: ${item.remarks || adjustment_type || ''}`,
            p_movement_date: adjustment_date || todayStr,
          });

          if (movementError) {
            console.error('Failed to record movement:', movementError);
            // Don't fail the whole operation, just log it
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      adjustment,
      adjustment_number: adjustmentNumber,
      adjustment_id: adjustment.id,
    });
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to adjust stock',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

