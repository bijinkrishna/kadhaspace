import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/recipes/[id] - Get single recipe with cost breakdown
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const portions = parseInt(searchParams.get('portions') || '1');

    // Get recipe with ingredients
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          notes,
          ingredients (
            id,
            name,
            last_price,
            unit,
            stock_quantity
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Calculate cost breakdown
    const costBreakdown = recipe.recipe_ingredients?.map((ri: any) => {
      const totalQuantity = ri.quantity * portions;
      const ingredientCost = totalQuantity * (ri.ingredients?.last_price || 0);
      
      return {
        ingredient_id: ri.ingredients?.id,
        ingredient_name: ri.ingredients?.name,
        quantity_per_portion: ri.quantity,
        total_quantity: totalQuantity,
        unit: ri.unit,
        unit_price: ri.ingredients?.last_price || 0,
        total_cost: ingredientCost,
        stock_available: ri.ingredients?.stock_quantity || 0,
        notes: ri.notes
      };
    }) || [];

    const totalCost = costBreakdown.reduce((sum: number, item: any) => sum + item.total_cost, 0);
    const costPerPortion = portions > 0 ? totalCost / portions : 0;

    return NextResponse.json({
      ...recipe,
      portions,
      cost_breakdown: costBreakdown,
      total_cost: totalCost,
      cost_per_portion: costPerPortion
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/recipes/[id] - Update recipe
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      category,
      portion_size,
      serving_size,
      prep_time_minutes,
      cook_time_minutes,
      difficulty,
      instructions,
      notes,
      is_active,
      selling_price,
      ingredients
    } = body;

    // Update recipe
    const { error: recipeError } = await supabase
      .from('recipes')
      .update({
        name,
        description,
        category,
        portion_size,
        serving_size: serving_size ? parseFloat(serving_size) : null,
        prep_time_minutes: prep_time_minutes ? parseInt(prep_time_minutes) : null,
        cook_time_minutes: cook_time_minutes ? parseInt(cook_time_minutes) : null,
        difficulty,
        instructions,
        notes,
        is_active,
        selling_price: selling_price ? parseFloat(selling_price) : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (recipeError) throw recipeError;

    // Update ingredients if provided
    if (ingredients) {
      // Delete existing ingredients
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id);

      // Insert new ingredients
      const recipeIngredients = ingredients.map((ing: any) => ({
        recipe_id: id,
        ingredient_id: ing.ingredient_id,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
        notes: ing.notes
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (ingredientsError) throw ingredientsError;
    }

    return NextResponse.json({
      success: true,
      message: 'Recipe updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/recipes/[id] - Delete recipe
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe', message: error.message },
      { status: 500 }
    );
  }
}

