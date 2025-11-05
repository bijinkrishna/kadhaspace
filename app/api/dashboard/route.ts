import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('📊 Dashboard API called');

    // 1. Get total ingredients count
    const { count: totalIngredients } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true });

    // 2. Get pending POs count
    const { count: pendingPOs } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed', 'partially_received']);

    // 3. Get low stock items - USE SELECT('*') TO GET CORRECT STOCK
    const { data: allIngredients, error: allIngError } = await supabase
      .from('ingredients')
      .select('*');

    if (allIngError) throw allIngError;

    // Filter low stock items in JavaScript to ensure correct data
    // Handle both field name patterns: stock_quantity/current_stock and min_stock_level/min_stock
    const lowStockItems = (allIngredients || [])
      .filter((item) => {
        const stock = item.stock_quantity ?? item.current_stock ?? 0;
        const minStock = item.min_stock_level ?? item.min_stock ?? 0;
        return stock < minStock;
      })
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        stock_quantity: item.stock_quantity ?? item.current_stock ?? 0,
        min_stock_level: item.min_stock_level ?? item.min_stock ?? 0,
        unit: item.unit,
      }));

    const lowStockCount = (allIngredients || []).filter((item) => {
      const stock = item.stock_quantity ?? item.current_stock ?? 0;
      const minStock = item.min_stock_level ?? item.min_stock ?? 0;
      return stock < minStock;
    }).length;

    // 4. Get today's GRNs count
    const today = new Date().toISOString().split('T')[0];
    const { count: todayReceipts } = await supabase
      .from('grns')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // 5. Get pending POs list with vendor names
    const { data: pendingPOsList, error: posError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        total_amount,
        total_items_count,
        vendors (
          name
        )
      `)
      .in('status', ['pending', 'confirmed', 'partially_received'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (posError) throw posError;

    const formattedPendingPOsList = (pendingPOsList || []).map((po: any) => ({
      id: po.id,
      po_number: po.po_number,
      vendor_name: po.vendors?.name || 'Unknown',
      total_amount: po.total_amount || 0,
      total_items_count: po.total_items_count || 0,
    }));

    // 6. Get recent stock movements
    const { data: recentMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select(`
        id,
        created_at,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        ingredients (name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (movementsError) throw movementsError;

    const formattedRecentMovements = (recentMovements || []).map((movement: any) => ({
      id: movement.id,
      created_at: movement.created_at,
      ingredient_name: movement.ingredients?.name || 'Unknown',
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      reference_type: movement.reference_type,
      reference_id: movement.reference_id,
    }));

    // 7. Get pending intends with item counts
    const { data: pendingIntends, error: intendsError } = await supabase
      .from('intends')
      .select(`
        id,
        intend_number,
        intend_items (id)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (intendsError) throw intendsError;

    const formattedPendingIntends = (pendingIntends || []).map((intend: any) => ({
      id: intend.id,
      intend_number: intend.intend_number,
      item_count: intend.intend_items?.length || 0,
    }));

    // 8. Get payment summaries
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, payment_date, status')
      .eq('status', 'completed');

    if (paymentsError) throw paymentsError;

    const totalPaid = (allPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    // Get outstanding POs
    const { data: outstandingPOs, error: outstandingError } = await supabase
      .from('purchase_orders')
      .select('actual_receivable_amount, total_paid, total_amount')
      .in('payment_status', ['unpaid', 'partial']);

    if (outstandingError) throw outstandingError;

    const totalOutstanding = (outstandingPOs || []).reduce((sum: number, po: any) => {
      const receivable = po.actual_receivable_amount || po.total_amount || 0;
      const paid = po.total_paid || 0;
      return sum + (receivable - paid);
    }, 0);

    // This month's payments
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthPayments = (allPayments || []).filter((p: any) => 
      new Date(p.payment_date) >= new Date(thisMonthStart)
    );
    const thisMonthPaid = thisMonthPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // 9. Get recipe summaries
    const { data: allRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        is_active,
        recipe_ingredients (
          quantity,
          ingredients (
            last_price
          )
        )
      `);

    if (recipesError) throw recipesError;

    const totalRecipes = (allRecipes || []).length;
    const activeRecipes = (allRecipes || []).filter((r: any) => r.is_active !== false).length;

    // Calculate COGS for each recipe
    const recipesWithCOGS = (allRecipes || []).map((recipe: any) => {
      const totalCost = (recipe.recipe_ingredients || []).reduce((sum: number, ri: any) => {
        const qty = parseFloat(ri.quantity || 0);
        const price = ri.ingredients?.last_price || 0;
        return sum + (qty * price);
      }, 0);
      return { ...recipe, cost_per_portion: totalCost };
    });

    const totalCOGS = recipesWithCOGS.reduce((sum: number, r: any) => sum + (r.cost_per_portion || 0), 0);
    const averageCOGS = activeRecipes > 0 ? totalCOGS / activeRecipes : 0;

    // Recent payments
    const { data: recentPayments, error: recentPaymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_number,
        payment_date,
        amount,
        purchase_orders (
          po_number,
          vendors (
            name
          )
        )
      `)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false })
      .limit(5);

    if (recentPaymentsError) throw recentPaymentsError;

    const formattedRecentPayments = (recentPayments || []).map((p: any) => ({
      id: p.id,
      payment_number: p.payment_number,
      payment_date: p.payment_date,
      amount: p.amount || 0,
      po_number: p.purchase_orders?.po_number || '-',
      vendor_name: p.purchase_orders?.vendors?.name || 'Unknown',
    }));

    // Recent recipes
    const { data: recentRecipes, error: recentRecipesError } = await supabase
      .from('recipes')
      .select('id, name, category, is_active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRecipesError) throw recentRecipesError;

    const formattedRecentRecipes = (recentRecipes || []).map((r: any) => {
      const recipeCOGS = recipesWithCOGS.find((rc: any) => rc.id === r.id);
      return {
        id: r.id,
        name: r.name,
        category: r.category || '-',
        is_active: r.is_active !== false,
        cost_per_portion: recipeCOGS?.cost_per_portion || 0,
      };
    });

    // 10. Get sales summaries
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('total_revenue, total_cost, gross_profit, profit_margin, total_dishes, sale_date, status');

    if (salesError) throw salesError;

    // Calculate sales statistics
    const totalSalesRevenue = (allSales || []).reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
    const totalSalesCOGS = (allSales || []).reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0);
    const totalGrossProfit = (allSales || []).reduce((sum: number, s: any) => sum + (s.gross_profit || 0), 0);
    const totalDishesSold = (allSales || []).reduce((sum: number, s: any) => sum + (s.total_dishes || 0), 0);
    const overallProfitMargin = totalSalesRevenue > 0 ? (totalGrossProfit / totalSalesRevenue) * 100 : 0;

    // This month's sales
    const thisMonthSales = (allSales || []).filter((s: any) => {
      const saleDate = new Date(s.sale_date);
      return saleDate >= new Date(thisMonthStart);
    });

    const thisMonthRevenue = thisMonthSales.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
    const thisMonthCOGS = thisMonthSales.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0);
    const thisMonthProfit = thisMonthSales.reduce((sum: number, s: any) => sum + (s.gross_profit || 0), 0);
    const thisMonthMargin = thisMonthRevenue > 0 ? (thisMonthProfit / thisMonthRevenue) * 100 : 0;

    // Today's sales
    const todaySales = (allSales || []).filter((s: any) => {
      const saleDate = new Date(s.sale_date);
      return saleDate.toISOString().split('T')[0] === today;
    });

    const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
    const todayCOGS = todaySales.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0);
    const todayProfit = todaySales.reduce((sum: number, s: any) => sum + (s.gross_profit || 0), 0);

    // Recent sales
    const { data: recentSales, error: recentSalesError } = await supabase
      .from('sales')
      .select('id, sale_number, sale_date, total_revenue, total_cost, gross_profit, profit_margin, status')
      .order('sale_date', { ascending: false })
      .limit(5);

    if (recentSalesError) throw recentSalesError;

    const formattedRecentSales = (recentSales || []).map((s: any) => ({
      id: s.id,
      sale_number: s.sale_number,
      sale_date: s.sale_date,
      total_revenue: s.total_revenue || 0,
      total_cost: s.total_cost || 0,
      gross_profit: s.gross_profit || 0,
      profit_margin: s.profit_margin || 0,
      status: s.status,
    }));

    // Pending sales count
    const pendingSalesCount = (allSales || []).filter((s: any) => s.status === 'pending').length;

    return NextResponse.json(
      {
        totalIngredients: totalIngredients || 0,
        pendingPOs: formattedPendingPOsList.length,
        lowStockCount,
        todayReceipts: todayReceipts || 0,
        lowStockItems,
        pendingPOsList: formattedPendingPOsList,
        recentMovements: formattedRecentMovements,
        pendingIntends: formattedPendingIntends,
        // Payment data
        totalPaid,
        totalOutstanding,
        thisMonthPaid,
        recentPayments: formattedRecentPayments,
        // Recipe data
        totalRecipes,
        activeRecipes,
        totalCOGS,
        averageCOGS,
        recentRecipes: formattedRecentRecipes,
        // Sales data
        totalSalesRevenue,
        totalSalesCOGS,
        totalGrossProfit,
        overallProfitMargin,
        totalDishesSold,
        thisMonthRevenue,
        thisMonthCOGS,
        thisMonthProfit,
        thisMonthMargin,
        todayRevenue,
        todayCOGS,
        todayProfit,
        pendingSalesCount,
        recentSales: formattedRecentSales,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
