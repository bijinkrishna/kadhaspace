import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/recipes - List all recipes with current cost
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    let query = supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          ingredients (
            id,
            name,
            last_price,
            unit
          )
        )
      `)
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }
    if (active !== null) {
      query = query.eq('is_active', active === 'true');
    }

    const { data: recipes, error } = await query;

    if (error) throw error;

    // Calculate current cost for each recipe
    const recipesWithCost = recipes?.map(recipe => {
      const totalCost = recipe.recipe_ingredients?.reduce((sum: number, ri: any) => {
        const ingredientCost = (ri.quantity || 0) * (ri.ingredients?.last_price || 0);
        return sum + ingredientCost;
      }, 0) || 0;

      return {
        ...recipe,
        current_cost: totalCost,
        ingredient_count: recipe.recipe_ingredients?.length || 0,
        selling_price: recipe.selling_price || 0,  // Include selling price
        profit_margin: recipe.selling_price > 0 
          ? (((recipe.selling_price - totalCost) / recipe.selling_price) * 100)
          : 0
      };
    });

    return NextResponse.json(recipesWithCost || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create new recipe
export async function POST(request: Request) {
  try {
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
      selling_price,
      ingredients // Array of { ingredient_id, quantity, unit, notes }
    } = body;

    // Validate
    if (!name || !ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Recipe name and at least one ingredient required' },
        { status: 400 }
      );
    }

    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
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
        selling_price: selling_price ? parseFloat(selling_price) : 0,  // Add this
        is_active: true
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Add ingredients
    const recipeIngredients = ingredients.map((ing: any) => ({
      recipe_id: recipe.id,
      ingredient_id: ing.ingredient_id,
      quantity: parseFloat(ing.quantity),
      unit: ing.unit,
      notes: ing.notes
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(recipeIngredients);

    if (ingredientsError) throw ingredientsError;

    console.log('✅ Recipe created:', recipe.name);

    return NextResponse.json({
      success: true,
      recipe
    });
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe', message: error.message },
      { status: 500 }
    );
  }
}

