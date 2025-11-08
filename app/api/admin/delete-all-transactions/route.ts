import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * ⚠️ DANGER ZONE ⚠️
 * This endpoint deletes ALL transaction data from the database.
 * This includes:
 * - All sales and sale items
 * - All payments (PO payments and expense payments)
 * - All GRNs and GRN items
 * - All purchase orders and PO items
 * - All intends and intend items
 * - All stock movements
 * - All stock adjustments
 * - All other expenses and their payments
 * 
 * This operation is IRREVERSIBLE and should only be used for:
 * - Development/testing environments
 * - Complete data reset
 * 
 * IMPORTANT: This does NOT delete:
 * - Ingredients (master data)
 * - Vendors (master data)
 * - Recipes (master data)
 * - Users (master data)
 * - Categories (master data)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');
    
    // Require explicit confirmation
    if (confirm !== 'DELETE_ALL_TRANSACTIONS') {
      return NextResponse.json(
        { 
          error: 'Confirmation required',
          message: 'This operation will delete ALL transaction data. Add ?confirm=DELETE_ALL_TRANSACTIONS to proceed.'
        },
        { status: 400 }
      );
    }

    console.log('⚠️ Starting deletion of all transaction data...');

    const errors: string[] = [];
    const deletedCounts: Record<string, number> = {};

    // Helper function to delete all records from a table in batches
    const deleteAllFromTable = async (tableName: string): Promise<number> => {
      let totalDeleted = 0;
      let hasMore = true;
      const batchSize = 1000;

      while (hasMore) {
        // Fetch a batch of IDs
        const { data: batch, error: fetchError } = await supabase
          .from(tableName)
          .select('id')
          .limit(batchSize);

        if (fetchError) {
          console.error(`Error fetching ${tableName}:`, fetchError);
          errors.push(`${tableName}: ${fetchError.message}`);
          break;
        }

        if (!batch || batch.length === 0) {
          hasMore = false;
          break;
        }

        // Delete the batch
        const { count, error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in('id', batch.map((r: any) => r.id));

        if (deleteError) {
          console.error(`Error deleting ${tableName}:`, deleteError);
          errors.push(`${tableName}: ${deleteError.message}`);
          break;
        }

        totalDeleted += count || batch.length;
        
        // If we got fewer records than the batch size, we're done
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }

      return totalDeleted;
    };

    // Delete in order of dependencies (children first, then parents)

    // 1. Delete production consumption (depends on sales)
    console.log('Deleting production consumption...');
    deletedCounts.production_consumption = await deleteAllFromTable('production_consumption');

    // 2. Delete sale items (depends on sales)
    console.log('Deleting sale items...');
    deletedCounts.sale_items = await deleteAllFromTable('sale_items');

    // 3. Delete sales
    console.log('Deleting sales...');
    deletedCounts.sales = await deleteAllFromTable('sales');

    // 4. Delete other expense payments (depends on other_expenses)
    console.log('Deleting other expense payments...');
    deletedCounts.other_expense_payments = await deleteAllFromTable('other_expense_payments');

    // 5. Delete other expenses
    console.log('Deleting other expenses...');
    deletedCounts.other_expenses = await deleteAllFromTable('other_expenses');

    // 6. Delete payments (depends on purchase_orders)
    console.log('Deleting payments...');
    deletedCounts.payments = await deleteAllFromTable('payments');

    // 7. Delete stock movements (depends on ingredients)
    console.log('Deleting stock movements...');
    deletedCounts.stock_movements = await deleteAllFromTable('stock_movements');

    // 8. Delete stock adjustments
    console.log('Deleting stock adjustments...');
    deletedCounts.stock_adjustments = await deleteAllFromTable('stock_adjustments');

    // 9. Delete GRN items (depends on GRNs)
    console.log('Deleting GRN items...');
    deletedCounts.grn_items = await deleteAllFromTable('grn_items');

    // 10. Delete GRNs (depends on purchase_orders)
    console.log('Deleting GRNs...');
    deletedCounts.grns = await deleteAllFromTable('grns');

    // 11. Delete PO items (depends on purchase_orders)
    console.log('Deleting PO items...');
    deletedCounts.po_items = await deleteAllFromTable('po_items');

    // 12. Delete purchase orders
    console.log('Deleting purchase orders...');
    deletedCounts.purchase_orders = await deleteAllFromTable('purchase_orders');

    // 13. Delete intend items (depends on intends)
    console.log('Deleting intend items...');
    deletedCounts.intend_items = await deleteAllFromTable('intend_items');

    // 14. Delete intends
    console.log('Deleting intends...');
    deletedCounts.intends = await deleteAllFromTable('intends');

    // 15. Reset stock quantities in ingredients (set to 0)
    console.log('Resetting ingredient stock quantities...');
    let ingredientsUpdated = 0;
    let hasMoreIngredients = true;
    const ingredientBatchSize = 1000;

    while (hasMoreIngredients) {
      const { data: ingredientBatch, error: fetchIngError } = await supabase
        .from('ingredients')
        .select('id')
        .limit(ingredientBatchSize);

      if (fetchIngError) {
        console.error('Error fetching ingredients:', fetchIngError);
        errors.push(`Ingredients stock reset: ${fetchIngError.message}`);
        break;
      }

      if (!ingredientBatch || ingredientBatch.length === 0) {
        hasMoreIngredients = false;
        break;
      }

      const { count, error: updateError } = await supabase
        .from('ingredients')
        .update({ stock_quantity: 0, current_stock: 0 })
        .in('id', ingredientBatch.map((r: any) => r.id));

      if (updateError) {
        console.error('Error resetting stock:', updateError);
        errors.push(`Stock reset: ${updateError.message}`);
        break;
      }

      ingredientsUpdated += count || ingredientBatch.length;

      if (ingredientBatch.length < ingredientBatchSize) {
        hasMoreIngredients = false;
      }
    }

    deletedCounts.ingredients_stock_reset = ingredientsUpdated;

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    console.log('✅ Deletion complete. Total records deleted:', totalDeleted);
    console.log('Deleted counts:', deletedCounts);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: true,
          warning: 'Some deletions had errors',
          deletedCounts,
          errors,
          totalDeleted,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All transaction data deleted successfully',
      deletedCounts,
      totalDeleted,
    });
  } catch (error: any) {
    console.error('❌ Error deleting transaction data:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete transaction data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
