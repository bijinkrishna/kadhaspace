import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Creating test data...');

    // 1. Create test vendor
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        name: 'Test Vendor',
        phone: '9999999999',
        email: 'test@vendor.com',
      })
      .select()
      .single();

    if (vendorError) throw vendorError;

    // 2. Create test ingredients
    const testIngredients = [
      { name: 'Test Tomato', unit: 'kg', min_stock: 10, current_stock: 0 },
      { name: 'Test Onion', unit: 'kg', min_stock: 5, current_stock: 0 },
      { name: 'Test Garlic', unit: 'kg', min_stock: 2, current_stock: 0 },
    ];

    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(testIngredients)
      .select();

    if (ingredientsError) throw ingredientsError;

    // 3. Create test intend
    const { data: intendNumberData, error: intendNumberError } = await supabase.rpc(
      'generate_intend_number'
    );

    if (intendNumberError) throw intendNumberError;
    const intendNumber = intendNumberData;

    const { data: intend, error: intendError } = await supabase
      .from('intends')
      .insert({
        intend_number: intendNumber,
        status: 'pending',
        notes: 'Test intend for development',
      })
      .select()
      .single();

    if (intendError) throw intendError;

    // 4. Create intend items
    const intendItems = ingredients.map((ing) => ({
      intend_id: intend.id,
      ingredient_id: ing.id,
      quantity_requested: 100,
      remarks: 'Test item',
    }));

    const { error: intendItemsError } = await supabase.from('intend_items').insert(intendItems);

    if (intendItemsError) throw intendItemsError;

    // 5. Create test PO
    const { data: poNumberData, error: poNumberError } = await supabase.rpc('generate_po_number');

    if (poNumberError) throw poNumberError;
    const poNumber = poNumberData;

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        vendor_id: vendor.id,
        intend_id: intend.id,
        status: 'confirmed',
        total_amount: 3000,
        total_items_count: 3,
        received_items_count: 0,
        received_percentage: 0,
      })
      .select()
      .single();

    if (poError) throw poError;

    // 6. Create PO items
    const poItems = ingredients.map((ing, idx) => ({
      po_id: po.id,
      ingredient_id: ing.id,
      quantity_ordered: 100,
      unit_price: (idx + 1) * 10,
      quantity_received: 0,
    }));

    const { data: createdPoItems, error: poItemsError } = await supabase
      .from('po_items')
      .insert(poItems)
      .select();

    if (poItemsError) throw poItemsError;

    // 7. Create test GRN
    const { data: grnNumberData, error: grnNumberError } = await supabase.rpc(
      'generate_grn_number'
    );

    if (grnNumberError) throw grnNumberError;
    const grnNumber = grnNumberData;

    const { data: grn, error: grnError } = await supabase
      .from('grns')
      .insert({
        grn_number: grnNumber,
        po_id: po.id,
        received_date: new Date().toISOString().split('T')[0],
        received_by: 'Test User',
        status: 'completed',
      })
      .select()
      .single();

    if (grnError) throw grnError;

    // 8. Create GRN items and record stock movements
    for (let i = 0; i < createdPoItems.length; i++) {
      const poItem = createdPoItems[i];
      const ingredient = ingredients[i];
      const quantityReceived = 80; // Receive 80 out of 100
      const unitPrice = (i + 1) * 10;

      // Create GRN item
      const { error: grnItemError } = await supabase.from('grn_items').insert({
        grn_id: grn.id,
        po_item_id: poItem.id,
        ingredient_id: ingredient.id,
        quantity_ordered: 100,
        quantity_received: quantityReceived,
        unit_price_ordered: unitPrice,
        unit_price_actual: unitPrice,
      });

      if (grnItemError) throw grnItemError;

      // Update po_item quantity_received
      const { error: updatePOItemError } = await supabase
        .from('po_items')
        .update({ quantity_received: quantityReceived })
        .eq('id', poItem.id);

      if (updatePOItemError) throw updatePOItemError;

      // Update ingredient last_price
      const { error: updateIngredientError } = await supabase
        .from('ingredients')
        .update({ last_price: unitPrice })
        .eq('id', ingredient.id);

      if (updateIngredientError) throw updateIngredientError;

      // Record stock movement
      try {
        const { error: movementError } = await supabase.rpc('record_stock_movement', {
          p_ingredient_id: ingredient.id,
          p_movement_type: 'in',
          p_quantity: quantityReceived,
          p_reference_type: 'grn',
          p_reference_id: grn.id,
          p_unit_cost: unitPrice,
          p_remarks: `Test: PO ${poNumber}, GRN ${grnNumber}`,
          p_movement_date: new Date().toISOString().split('T')[0],
        });

        if (movementError) {
          console.error('Failed to record stock movement:', movementError);
          // Don't fail the whole operation if stock movement fails
        }
      } catch (rpcError) {
        console.error('Error calling record_stock_movement RPC:', rpcError);
        // Continue without failing the whole GRN creation
      }
    }

    // 9. Update PO status and summary
    const { data: allPoItems, error: fetchPoItemsError } = await supabase
      .from('po_items')
      .select('quantity_ordered, quantity_received')
      .eq('po_id', po.id);

    if (fetchPoItemsError) {
      console.error('Failed to fetch po_items for summary:', fetchPoItemsError);
    } else {
      const totalItems = allPoItems?.length || 0;
      const receivedItems = (allPoItems || []).filter(
        (item) => (item.quantity_received || 0) >= item.quantity_ordered
      ).length;
      const partialItems = (allPoItems || []).filter(
        (item) =>
          (item.quantity_received || 0) > 0 &&
          (item.quantity_received || 0) < item.quantity_ordered
      ).length;
      const receivedPercentage = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

      let newStatus = 'pending';
      if (receivedItems === totalItems && totalItems > 0) {
        newStatus = 'received';
      } else if (receivedItems > 0 || partialItems > 0) {
        newStatus = 'partially_received';
      }

      const { error: updatePOError } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          total_items_count: totalItems,
          received_items_count: receivedItems,
          received_percentage: receivedPercentage,
        })
        .eq('id', po.id);

      if (updatePOError) {
        console.error('Failed to update PO status:', updatePOError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        vendor: vendor.name,
        ingredients: ingredients.length,
        intend: intendNumber,
        po: poNumber,
        grn: grnNumber,
      },
    });
  } catch (error: any) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test data',
        details: error?.message || error?.code || String(error),
      },
      { status: 500 }
    );
  }
}




