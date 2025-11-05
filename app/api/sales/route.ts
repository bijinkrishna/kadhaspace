import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/sales - List all sales
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('sales')
      .select(`
        id,
        sale_number,
        sale_date,
        total_dishes,
        total_revenue,
        total_cost,
        gross_profit,
        profit_margin,
        status,
        processed_at,
        notes,
        created_at,
        sale_items (
          id,
          quantity,
          recipe_id,
          recipes (
            name
          )
        )
      `)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (dateFrom) {
      query = query.gte('sale_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('sale_date', dateTo);
    }

    const { data: sales, error } = await query;

    if (error) throw error;

    return NextResponse.json(sales || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/sales - Create new sale
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sale_date,
      items, // Array of { recipe_id, quantity, selling_price }
      notes
    } = body;

    // Validate
    if (!sale_date || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale date and at least one item required' },
        { status: 400 }
      );
    }

    // Generate sale number
    const { data: saleNumber, error: numberError } = await supabase
      .rpc('generate_sale_number');

    if (numberError) throw numberError;

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_number: saleNumber,
        sale_date,
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Get recipe costs
    const recipeIds = items.map((item: any) => item.recipe_id);
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        recipe_ingredients (
          quantity,
          ingredients (
            last_price
          )
        )
      `)
      .in('id', recipeIds);

    if (recipesError) throw recipesError;

    // Calculate costs and create sale items
    const saleItems = items.map((item: any) => {
      const recipe = recipes?.find((r: any) => r.id === item.recipe_id);
      
      // Calculate cost per portion from recipe
      const costPerPortion = recipe?.recipe_ingredients?.reduce((sum: number, ri: any) => {
        return sum + (ri.quantity * (ri.ingredients?.last_price || 0));
      }, 0) || 0;

      const totalCost = costPerPortion * item.quantity;
      const totalRevenue = (item.selling_price || 0) * item.quantity;
      const profit = totalRevenue - totalCost;

      return {
        sale_id: sale.id,
        recipe_id: item.recipe_id,
        quantity: item.quantity,
        selling_price: item.selling_price || 0,
        cost_per_portion: costPerPortion,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        profit: profit
      };
    });

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // Validate stock availability before processing
    const { data: recipesWithStock, error: recipesStockError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        recipe_ingredients (
          quantity,
          unit,
          ingredient_id,
          ingredients (
            id,
            name,
            stock_quantity
          )
        )
      `)
      .in('id', items.map((item: any) => item.recipe_id));

    if (recipesStockError) throw recipesStockError;

    // Check stock availability
    const stockIssues: string[] = [];

    for (const item of items) {
      const recipe = recipesWithStock?.find((r: any) => r.id === item.recipe_id);
      
      if (recipe) {
        for (const ri of recipe.recipe_ingredients) {
          const requiredQty = ri.quantity * item.quantity;
          
          // Handle ingredients - Supabase can return object or array
          const ingredient = Array.isArray(ri.ingredients) 
            ? ri.ingredients[0] 
            : ri.ingredients;
          
          const availableQty = ingredient?.stock_quantity || 0;
          
          if (requiredQty > availableQty) {
            stockIssues.push(
              `${ingredient?.name}: Need ${requiredQty}${ri.unit}, only ${availableQty}${ri.unit} available`
            );
          }
        }
      }
    }

    if (stockIssues.length > 0) {
      // Rollback - delete the sale
      await supabase.from('sales').delete().eq('id', sale.id);
      
      return NextResponse.json(
        { 
          error: 'Insufficient stock', 
          details: stockIssues,
          message: 'Cannot process sale due to insufficient stock:\n' + stockIssues.join('\n')
        },
        { status: 400 }
      );
    }

    // Continue with processing if stock is sufficient
    const { error: processError } = await supabase.rpc('process_sale', {
      p_sale_id: sale.id
    });

    if (processError) {
      console.error('Error processing sale:', processError);
      // Rollback - delete the sale
      await supabase.from('sales').delete().eq('id', sale.id);
      throw new Error('Failed to process sale and update stock: ' + processError.message);
    }

    // Update sale status to processed
    await supabase
      .from('sales')
      .update({ 
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', sale.id);

    console.log('✅ Sale created and processed:', sale.sale_number);

    return NextResponse.json({
      success: true,
      sale
    });

  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale', message: error.message },
      { status: 500 }
    );
  }
}

