import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('po_id');

    let query = supabase
      .from('grns')
      .select(`
        *,
        grn_items (
          *,
          ingredients (
            name,
            unit
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (poId) {
      query = query.eq('po_id', poId);
    }

    const { data: grns, error } = await query;

    if (error) throw error;

    return NextResponse.json(grns || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error fetching GRNs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GRNs', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { po_id, received_date, received_by, notes, items } = body;

    // Validate
    if (!po_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'PO ID and items are required' },
        { status: 400 }
      );
    }

    // Fetch PO details to get PO number
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .eq('id', po_id)
      .single();

    if (poError) throw poError;

    // Generate unique GRN number with date + counter (similar to adjustment numbers)
    const today = new Date();
    const todayStr = received_date || today.toISOString().split('T')[0]; // Use received_date or today
    const dateStr = todayStr.replace(/-/g, ''); // YYYYMMDD
    
    // Get count of GRNs created today to create sequential number
    const { count } = await supabase
      .from('grns')
      .select('*', { count: 'exact', head: true })
      .eq('received_date', todayStr);

    const sequentialNumber = (count || 0) + 1;
    let grnNumber = `GRN-${dateStr}-${String(sequentialNumber).padStart(3, '0')}`;
    // Format: GRN-20251105-001, GRN-20251105-002, etc.

    // Double-check uniqueness and retry if needed
    let retries = 0;
    const maxRetries = 3;
    while (retries < maxRetries) {
      const { data: existing } = await supabase
        .from('grns')
        .select('grn_number')
        .eq('grn_number', grnNumber)
        .maybeSingle();

      if (!existing) {
        break; // Number is unique, proceed
      }

      // If collision, increment sequence number
      retries++;
      const newSequentialNumber = sequentialNumber + retries;
      grnNumber = `GRN-${dateStr}-${String(newSequentialNumber).padStart(3, '0')}`;
    }

    if (retries >= maxRetries) {
      // Fallback: use timestamp + random suffix if still colliding
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      grnNumber = `GRN-${dateStr}-${timestamp}${randomSuffix}`;
    }

    // Create GRN
    let grn: any;
    let grnError: any;
    
    const { data: grnData, error: grnErr } = await supabase
      .from('grns')
      .insert({
        grn_number: grnNumber,
        po_id,
        received_date: received_date || new Date().toISOString().split('T')[0],
        received_by,
        notes,
        status: 'completed',
      })
      .select()
      .single();

    grn = grnData;
    grnError = grnErr;

    if (grnError) {
      // Check if it's a duplicate key error (race condition)
      if (grnError.code === '23505' && grnError.message?.includes('grn_number')) {
        console.error('Duplicate GRN number detected:', grnNumber);
        // Retry with a new number
        const retryDateStr = todayStr.replace(/-/g, '');
        const timestamp = Date.now().toString().slice(-6);
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const retryGrnNumber = `GRN-${retryDateStr}-${timestamp}${randomSuffix}`;
        
        const { data: retryGrn, error: retryError } = await supabase
          .from('grns')
          .insert({
            grn_number: retryGrnNumber,
            po_id,
            received_date: received_date || new Date().toISOString().split('T')[0],
            received_by,
            notes,
            status: 'completed',
          })
          .select()
          .single();

        if (retryError) throw retryError;
        
        // Use retry GRN for rest of processing
        grn = retryGrn;
        grnNumber = retryGrnNumber;
      } else {
        throw grnError;
      }
    }

    if (!grn) {
      throw new Error('Failed to create GRN');
    }

    // Process each item
    for (const item of items) {
      // Create GRN item
      const { error: grnItemError } = await supabase
        .from('grn_items')
        .insert({
          grn_id: grn.id,
          po_item_id: item.po_item_id,
          ingredient_id: item.ingredient_id,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received,
          unit_price_ordered: item.unit_price_ordered,
          unit_price_actual: item.unit_price_actual,
          remarks: item.remarks,
        });

      if (grnItemError) {
        console.error('Failed to create GRN item:', grnItemError);
        return NextResponse.json(
          { error: 'Failed to create GRN item', details: grnItemError.message },
          { status: 500 }
        );
      }

      // Update PO item quantity received (additive - add to existing quantity)
      const { data: existingPOItem } = await supabase
        .from('po_items')
        .select('quantity_received')
        .eq('id', item.po_item_id)
        .single();

      const existingReceived = existingPOItem?.quantity_received || 0;
      const newQuantityReceived = existingReceived + item.quantity_received;

      const { error: updatePOItemError } = await supabase
        .from('po_items')
        .update({ quantity_received: newQuantityReceived })
        .eq('id', item.po_item_id);

      if (updatePOItemError) {
        console.error('Failed to update PO item:', updatePOItemError);
        return NextResponse.json(
          { error: 'Failed to update PO item', details: updatePOItemError.message },
          { status: 500 }
        );
      }

      // Update ingredient last_price
      const { error: updateIngredientError } = await supabase
        .from('ingredients')
        .update({ last_price: item.unit_price_actual })
        .eq('id', item.ingredient_id);

      if (updateIngredientError) {
        console.error('Failed to update ingredient price:', updateIngredientError);
        // Don't fail the whole operation, just log it
      }

      // Record stock movement with descriptive remarks
      try {
        const { error: stockError } = await supabase.rpc('record_stock_movement', {
          p_ingredient_id: item.ingredient_id,
          p_movement_type: 'in',
          p_quantity: item.quantity_received,
          p_reference_type: 'grn',
          p_reference_id: grn.id,
          p_unit_cost: item.unit_price_actual,
          p_remarks: `Purchase: PO ${po.po_number}, GRN ${grnNumber}`, // Better remarks
          p_movement_date: received_date,
        });

        if (stockError) {
          console.error('Failed to record stock movement:', stockError);
          // Don't fail the whole operation if stock movement recording fails
        }
      } catch (rpcError) {
        console.error('Error calling record_stock_movement RPC:', rpcError);
        // Continue without failing the whole GRN creation
      }
    }

    // After all items processed, recalculate PO summary and status
    const { data: allPoItems, error: poItemsError } = await supabase
      .from('po_items')
      .select('quantity_ordered, quantity_received')
      .eq('po_id', po_id);

    if (poItemsError) {
      console.error('Failed to fetch po_items:', poItemsError);
    } else {
      const totalItems = allPoItems?.length || 0;
      
      // Count items where quantity_received >= quantity_ordered (fully received)
      const receivedItems = (allPoItems || []).filter(
        item => (item.quantity_received || 0) >= item.quantity_ordered
      ).length;
      
      // Check if any items have been partially received
      const partialItems = (allPoItems || []).filter(
        item => (item.quantity_received || 0) > 0 && (item.quantity_received || 0) < item.quantity_ordered
      ).length;
      
      // Calculate percentage based on items fully received
      const receivedPercentage = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

      // Determine status
      let newStatus = 'pending';
      if (receivedItems === totalItems && totalItems > 0) {
        newStatus = 'received';
      } else if (receivedItems > 0 || partialItems > 0) {
        newStatus = 'partially_received';
      }

      // Update PO with correct counts
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          total_items_count: totalItems,
          received_items_count: receivedItems,  // Use calculated value, not item_status
          received_percentage: receivedPercentage,
          status: newStatus
        })
        .eq('id', po_id);

      if (updateError) {
        console.error('Failed to update PO summary:', updateError);
      } else {
        console.log(`Updated PO ${po.po_number}: ${receivedItems}/${totalItems} items (${receivedPercentage.toFixed(0)}%) - Status: ${newStatus}`);
      }
    }

    return NextResponse.json({
      success: true,
      grn_number: grnNumber,
      grn_id: grn.id,
      message: 'Stock received successfully',
    });
  } catch (error: any) {
    console.error('Error creating GRN:', error);
    
    // Provide more detailed error message
    let errorMessage = 'Failed to create GRN';
    if (error?.message) {
      errorMessage += `: ${error.message}`;
    } else if (error?.code) {
      errorMessage += `: ${error.code}`;
    } else if (typeof error === 'string') {
      errorMessage += `: ${error}`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error?.message || error?.code || String(error),
        hint: error?.hint || ''
      },
      { status: 500 }
    );
  }
}

