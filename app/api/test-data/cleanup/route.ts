import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE() {
  try {
    console.log('Cleaning up test data...');

    // Delete in reverse order of dependencies

    // 1. Delete stock movements for test ingredients
    const { data: testIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', 'Test%');

    if (testIngredients && testIngredients.length > 0) {
      const testIngredientIds = testIngredients.map((i) => i.id);

      const { error: movementsError } = await supabase
        .from('stock_movements')
        .delete()
        .in('ingredient_id', testIngredientIds);

      if (movementsError) {
        console.error('Error deleting stock movements:', movementsError);
      }
    }

    // 2. Delete GRN items for test GRNs
    const { data: testGrns, error: grnsError } = await supabase
      .from('grns')
      .select('id')
      .or('notes.ilike.%Test%,notes.ilike.%test%');

    if (testGrns && testGrns.length > 0) {
      const testGrnIds = testGrns.map((g) => g.id);

      const { error: grnItemsError } = await supabase
        .from('grn_items')
        .delete()
        .in('grn_id', testGrnIds);

      if (grnItemsError) {
        console.error('Error deleting GRN items:', grnItemsError);
      }

      const { error: deleteGrnsError } = await supabase.from('grns').delete().in('id', testGrnIds);

      if (deleteGrnsError) {
        console.error('Error deleting GRNs:', deleteGrnsError);
      }
    }

    // 3. Delete PO items for test POs
    const { data: testPos, error: posError } = await supabase
      .from('purchase_orders')
      .select('id')
      .or('notes.ilike.%Test%,notes.ilike.%test%');

    if (testPos && testPos.length > 0) {
      const testPoIds = testPos.map((p) => p.id);

      const { error: poItemsError } = await supabase
        .from('po_items')
        .delete()
        .in('po_id', testPoIds);

      if (poItemsError) {
        console.error('Error deleting PO items:', poItemsError);
      }

      const { error: deletePosError } = await supabase
        .from('purchase_orders')
        .delete()
        .in('id', testPoIds);

      if (deletePosError) {
        console.error('Error deleting POs:', deletePosError);
      }
    }

    // 4. Delete intend items for test intends
    const { data: testIntends, error: intendsError } = await supabase
      .from('intends')
      .select('id')
      .or('notes.ilike.%Test%,notes.ilike.%test%');

    if (testIntends && testIntends.length > 0) {
      const testIntendIds = testIntends.map((i) => i.id);

      const { error: intendItemsError } = await supabase
        .from('intend_items')
        .delete()
        .in('intend_id', testIntendIds);

      if (intendItemsError) {
        console.error('Error deleting intend items:', intendItemsError);
      }

      const { error: deleteIntendsError } = await supabase
        .from('intends')
        .delete()
        .in('id', testIntendIds);

      if (deleteIntendsError) {
        console.error('Error deleting intends:', deleteIntendsError);
      }
    }

    // 5. Delete test ingredients (reuse IDs from step 1)
    if (testIngredients && testIngredients.length > 0) {
      const { error: deleteIngredientsError } = await supabase
        .from('ingredients')
        .delete()
        .in('id', testIngredients.map((i) => i.id));

      if (deleteIngredientsError) {
        console.error('Error deleting ingredients:', deleteIngredientsError);
      }
    }

    // 6. Delete test vendors
    const { data: testVendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id')
      .ilike('name', 'Test%');

    if (testVendors && testVendors.length > 0) {
      const { error: deleteVendorsError } = await supabase
        .from('vendors')
        .delete()
        .in('id', testVendors.map((v) => v.id));

      if (deleteVendorsError) {
        console.error('Error deleting vendors:', deleteVendorsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data cleaned up successfully',
    });
  } catch (error: any) {
    console.error('Error cleaning test data:', error);
    return NextResponse.json(
      { error: 'Failed to clean test data', details: error?.message || error?.code || String(error) },
      { status: 500 }
    );
  }
}

