import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface POItemInput {
  intend_item_id: string;
  ingredient_id: string;
  quantity: number;
  unit_price: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intend_id, vendor_id, items, expected_delivery_date, notes } = body;

    // Validate required fields
    if (!intend_id || typeof intend_id !== 'string') {
      return NextResponse.json(
        { error: 'intend_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (!vendor_id || typeof vendor_id !== 'string') {
      return NextResponse.json(
        { error: 'vendor_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must contain at least one item' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.intend_item_id || typeof item.intend_item_id !== 'string') {
        return NextResponse.json(
          { error: 'Each item must have a valid intend_item_id' },
          { status: 400 }
        );
      }
      if (!item.ingredient_id || typeof item.ingredient_id !== 'string') {
        return NextResponse.json(
          { error: 'Each item must have a valid ingredient_id' },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have a valid quantity greater than 0' },
          { status: 400 }
        );
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        return NextResponse.json(
          { error: 'Each item must have a valid unit_price (>= 0)' },
          { status: 400 }
        );
      }
    }

    // Verify intend exists
    const { data: existingIntend, error: intendError } = await supabase
      .from('intends')
      .select('id')
      .eq('id', intend_id)
      .single();

    if (intendError || !existingIntend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Verify vendor exists
    const { data: existingVendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', vendor_id)
      .single();

    if (vendorError || !existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Generate PO number using SQL function
    const { data: poNumberData, error: poNumberError } = await supabase.rpc('generate_po_number');

    if (poNumberError || !poNumberData) {
      console.error('Error generating PO number:', poNumberError);
      const errorMessage = poNumberError?.message || 'Unknown error';
      return NextResponse.json(
        {
          error: 'Failed to generate PO number',
          details: errorMessage.includes('function') || errorMessage.includes('does not exist')
            ? 'The generate_po_number() SQL function is missing. Please run supabase_setup_all_functions.sql in Supabase SQL Editor.'
            : errorMessage,
        },
        { status: 500 }
      );
    }

    const poNumber = poNumberData;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    // Create purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        intend_id: intend_id,
        vendor_id: vendor_id,
        status: 'pending',
        total_amount: totalAmount,
        expected_delivery_date: expected_delivery_date || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (poError) {
      console.error('Error creating purchase order:', poError);
      return NextResponse.json(
        { error: 'Failed to create purchase order' },
        { status: 500 }
      );
    }

    // Create PO items (link is established via po_items.intend_item_id → intend_items.id)
    const poItemIds: string[] = [];
    
    for (const item of items) {
      // Verify intend_item exists and belongs to this intend
      const { data: intendItem, error: intendItemError } = await supabase
        .from('intend_items')
        .select('id, intend_id')
        .eq('id', item.intend_item_id)
        .single();

      if (intendItemError || !intendItem || intendItem.intend_id !== intend_id) {
        console.error('Error: Intend item not found or does not belong to this intend:', item.intend_item_id);
        return NextResponse.json(
          { error: `Intend item ${item.intend_item_id} not found or invalid` },
          { status: 400 }
        );
      }

      // Create PO item
      // Note: total_price is a generated column, so we don't include it in the insert
      const { data: poItem, error: poItemError } = await supabase
        .from('po_items')
        .insert({
          po_id: purchaseOrder.id,
          intend_item_id: item.intend_item_id,
          ingredient_id: item.ingredient_id,
          quantity_ordered: item.quantity,
          unit_price: item.unit_price,
        })
        .select()
        .single();

      if (poItemError) {
        console.error('Error creating PO item:', poItemError);
        return NextResponse.json(
          { error: `Failed to create PO item for ${item.intend_item_id}` },
          { status: 500 }
        );
      }

      // Note: We don't update intend_items.po_item_id (column doesn't exist)
      // The link is maintained through po_items.intend_item_id

      // Update ingredient.last_price
      const { error: priceError } = await supabase
        .from('ingredients')
        .update({ last_price: item.unit_price })
        .eq('id', item.ingredient_id);

      if (priceError) {
        console.error('Error updating ingredient last_price:', priceError);
        // Don't fail the request if price update fails, just log it
      }

      poItemIds.push(poItem.id);
    }

    // Initialize PO summary fields
    const { error: updatePOError } = await supabase
      .from('purchase_orders')
      .update({
        total_items_count: items.length,
        received_items_count: 0,
        received_percentage: 0,
      })
      .eq('id', purchaseOrder.id);

    if (updatePOError) {
      console.error('Failed to update PO summary:', updatePOError);
      // Don't fail the request if summary update fails, but log it
    }

    // Check intend fulfillment status
    // Count total items in intend
    const { data: allIntendItems, error: countError } = await supabase
      .from('intend_items')
      .select('id')
      .eq('intend_id', intend_id);

    if (countError) {
      console.error('Error counting intend items:', countError);
      // Continue anyway, status update is not critical
    } else {
      const totalItems = allIntendItems?.length || 0;
      
      // Count how many intend items are referenced in po_items
      let itemsInPO = 0;
      if (allIntendItems && allIntendItems.length > 0) {
        const intendItemIds = allIntendItems.map(item => item.id);
        const { count, error: countError } = await supabase
          .from('po_items')
          .select('*', { count: 'exact', head: true })
          .in('intend_item_id', intendItemIds)
          .not('intend_item_id', 'is', null);
        
        if (countError) {
          console.error('Error counting items in PO:', countError);
        } else {
          itemsInPO = count || 0;
        }
      }

      // Determine new status
      let newStatus: 'pending' | 'partially_fulfilled' | 'fulfilled';
      if (itemsInPO === 0) {
        newStatus = 'pending';
      } else if (itemsInPO < totalItems) {
        newStatus = 'partially_fulfilled';
      } else {
        newStatus = 'fulfilled';
      }

      // Update intend status
      const { error: statusError } = await supabase
        .from('intends')
        .update({ status: newStatus })
        .eq('id', intend_id);

      if (statusError) {
        console.error('Error updating intend status:', statusError);
        // Continue anyway, status update is not critical
      }

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Purchase order created successfully',
          po_number: purchaseOrder.po_number,
          po_id: purchaseOrder.id,
          intend_status: newStatus,
        },
        { status: 201 }
      );
    }

    // Fallback response if status check failed
    return NextResponse.json(
      {
        success: true,
        message: 'Purchase order created successfully',
        po_number: purchaseOrder.po_number,
        po_id: purchaseOrder.id,
        intend_status: 'pending', // Default if calculation failed
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

