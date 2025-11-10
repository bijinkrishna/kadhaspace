import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      { count: totalIngredients, error: ingredientsCountError },
      { data: lowStockItemsRaw, error: lowStockError },
      { count: activeRecipes, error: recipesError },
      { count: openPOs, error: poCountError },
      { data: pendingIntends, error: intendsError },
      { data: recentReceipts, error: receiptsError },
      { data: recentMovements, error: movementsError },
    ] = await Promise.all([
      supabase.from('ingredients').select('id', { count: 'exact', head: true }),
      supabase
        .from('ingredients')
        .select('id, name, unit, stock_quantity, min_stock_level')
        .limit(5)
        .order('stock_quantity', { ascending: true }),
      supabase
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'partially_received']),
      supabase
        .from('intends')
        .select('id, intend_number, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('grns')
        .select(
          `id, grn_number, received_date, status,
           purchase_orders (po_number)`
        )
        .order('received_date', { ascending: false })
        .limit(5),
      supabase
        .from('stock_movements')
        .select(
          `id, movement_date, movement_type, quantity,
           ingredients (name, unit)`
        )
        .order('movement_date', { ascending: false })
        .limit(5),
    ]);

    if (
      ingredientsCountError ||
      lowStockError ||
      recipesError ||
      poCountError ||
      intendsError ||
      receiptsError ||
      movementsError
    ) {
      throw (
        ingredientsCountError ||
        lowStockError ||
        recipesError ||
        poCountError ||
        intendsError ||
        receiptsError ||
        movementsError
      );
    }

    const lowStockItems = (lowStockItemsRaw || [])
      .filter((item) => {
        const stock = Number(item.stock_quantity ?? 0);
        const minStock = Number(item.min_stock_level ?? 0);
        return minStock > 0 && stock < minStock;
      })
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        stock_quantity: Number(item.stock_quantity ?? 0),
        min_stock_level: Number(item.min_stock_level ?? 0),
      }));

    const pendingIntendCount = pendingIntends?.length ?? 0;

    return NextResponse.json({
      generated_at: today,
      summary: {
        totalIngredients: totalIngredients ?? 0,
        lowStockCount: lowStockItems.length,
        activeRecipes: activeRecipes ?? 0,
        openPurchaseOrders: openPOs ?? 0,
        pendingIntends: pendingIntendCount,
      },
      lowStockItems,
      pendingIntends: (pendingIntends || []).map((intend) => ({
        id: intend.id,
        intend_number: intend.intend_number || intend.id,
        created_at: intend.created_at,
        status: intend.status,
      })),
      openPurchaseOrders: openPOs ?? 0,
      recentReceipts: (recentReceipts || []).map((receipt) => ({
        id: receipt.id,
        grn_number: receipt.grn_number,
        received_date: receipt.received_date,
        status: receipt.status,
        po_number: Array.isArray(receipt.purchase_orders)
          ? receipt.purchase_orders[0]?.po_number
          : receipt.purchase_orders?.po_number,
      })),
      recentMovements: (recentMovements || []).map((movement) => ({
        id: movement.id,
        movement_date: movement.movement_date,
        movement_type: movement.movement_type,
        quantity: Number(movement.quantity ?? 0),
        ingredient_name: Array.isArray(movement.ingredients)
          ? movement.ingredients[0]?.name
          : movement.ingredients?.name,
        ingredient_unit: Array.isArray(movement.ingredients)
          ? movement.ingredients[0]?.unit
          : movement.ingredients?.unit,
      })),
    });
  } catch (error: any) {
    console.error('Error building staff dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to load staff dashboard', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
