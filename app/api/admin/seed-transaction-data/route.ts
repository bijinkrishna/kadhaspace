import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Seed comprehensive transaction data for testing
 * Creates data for all transaction tables that can be deleted
 */
export async function POST() {
  try {
    console.log('🌱 Starting to seed transaction data...');

    const errors: string[] = [];
    const createdCounts: Record<string, number> = {};

    // Helper to get or create test data
    const getOrCreateTestVendor = async () => {
      // Check if test vendor exists
      const { data: existing } = await supabase
        .from('vendors')
        .select('id')
        .ilike('name', 'Test Vendor%')
        .limit(1)
        .single();

      if (existing) return existing.id;

      // Create test vendor
      const { data: vendor, error } = await supabase
        .from('vendors')
        .insert({
          name: 'Test Vendor',
          contact: '1234567890',
          email: 'test@vendor.com',
        })
        .select('id')
        .single();

      if (error) throw error;
      return vendor.id;
    };

    const getIngredients = async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, unit')
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No ingredients found. Please create ingredients first.');
      }
      return data;
    };

    const getRecipes = async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, selling_price')
        .eq('is_active', true)
        .limit(5);

      if (error) throw error;
      return data || [];
    };

    const getExpenseCategories = async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, code')
        .limit(5);

      if (error) throw error;
      return data || [];
    };

    // Get master data
    const vendorId = await getOrCreateTestVendor();
    const ingredients = await getIngredients();
    const recipes = await getRecipes();
    const expenseCategories = await getExpenseCategories();

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients found. Please create ingredients first.' },
        { status: 400 }
      );
    }

    // 1. Create Intends
    console.log('Creating intends...');
    const intendCount = 5;
    const createdIntends: any[] = [];

    for (let i = 0; i < intendCount; i++) {
      // Try to generate intend ID, fallback to manual generation
      let intendIdOrNumber: string;
      try {
        const { data: intendIdData } = await supabase.rpc('generate_intend_id');
        intendIdOrNumber = intendIdData || `INT-${Date.now()}-${i}`;
      } catch {
        intendIdOrNumber = `INT-${Date.now()}-${i}`;
      }

      // Check if intends table has intend_number or name field
      const { data: intend, error: intendError } = await supabase
        .from('intends')
        .insert({
          name: intendIdOrNumber, // Use name field (or intend_number if that's the column name)
          status: i % 2 === 0 ? 'intend_generated' : 'po_generated',
          notes: `Test intend ${i + 1}`,
        })
        .select()
        .single();

      if (intendError) {
        errors.push(`Intend ${i + 1}: ${intendError.message}`);
        continue;
      }

      createdIntends.push(intend);

      // Create intend items
      const itemsPerIntend = Math.min(3, ingredients.length);
      const intendItems = ingredients.slice(0, itemsPerIntend).map((ing) => ({
        intend_id: intend.id,
        ingredient_id: ing.id,
        quantity_requested: Math.round(50 + Math.random() * 100),
        remarks: `Test item for ${ing.name}`,
      }));

      const { error: itemsError } = await supabase.from('intend_items').insert(intendItems);
      if (itemsError) {
        errors.push(`Intend items ${i + 1}: ${itemsError.message}`);
      }
    }

    createdCounts.intends = createdIntends.length;
    createdCounts.intend_items = createdIntends.length * Math.min(3, ingredients.length);

    // 2. Create Purchase Orders
    console.log('Creating purchase orders...');
    const createdPOs: any[] = [];

    for (let i = 0; i < Math.min(3, createdIntends.length); i++) {
      const intend = createdIntends[i];
      const { data: poNumberData } = await supabase.rpc('generate_po_number').catch(() => ({ data: `PO-${Date.now()}-${i}` }));
      const poNumber = poNumberData || `PO-${Date.now()}-${i}`;

      // Get intend items
      const { data: intendItems } = await supabase
        .from('intend_items')
        .select('*')
        .eq('intend_id', intend.id);

      if (!intendItems || intendItems.length === 0) continue;

      const totalAmount = intendItems.reduce((sum, item) => {
        const unitPrice = Math.round(10 + Math.random() * 50);
        return sum + (item.quantity_requested || 0) * unitPrice;
      }, 0);

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          vendor_id: vendorId,
          intend_id: intend.id,
          status: i === 0 ? 'received' : i === 1 ? 'partially_received' : 'pending',
          total_amount: Math.round(totalAmount),
          total_items_count: intendItems.length,
          payment_status: i === 0 ? 'paid' : i === 1 ? 'partial' : 'unpaid',
        })
        .select()
        .single();

      if (poError) {
        errors.push(`PO ${i + 1}: ${poError.message}`);
        continue;
      }

      createdPOs.push(po);

      // Create PO items
      const poItems = intendItems.map((item, idx) => {
        const unitPrice = Math.round(10 + Math.random() * 50);
        const quantityOrdered = item.quantity_requested || 0;
        const quantityReceived = i === 0 ? quantityOrdered : i === 1 ? Math.round(quantityOrdered * 0.7) : 0;

        return {
          po_id: po.id,
          ingredient_id: item.ingredient_id,
          intend_item_id: item.id,
          quantity_ordered: quantityOrdered,
          unit_price: unitPrice,
          quantity_received: quantityReceived,
        };
      });

      const { data: createdPoItems, error: poItemsError } = await supabase
        .from('po_items')
        .insert(poItems)
        .select();

      if (poItemsError) {
        errors.push(`PO items ${i + 1}: ${poItemsError.message}`);
      } else {
        createdCounts.po_items = (createdCounts.po_items || 0) + (createdPoItems?.length || 0);
      }
    }

    createdCounts.purchase_orders = createdPOs.length;

    // 3. Create GRNs
    console.log('Creating GRNs...');
    const createdGRNs: any[] = [];

    for (let i = 0; i < Math.min(2, createdPOs.length); i++) {
      const po = createdPOs[i];
      // Generate GRN number manually (similar to GRN route)
      const receivedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const dateStr = receivedDate.replace(/-/g, ''); // YYYYMMDD
      
      // Get count of GRNs for this date
      const { count } = await supabase
        .from('grns')
        .select('*', { count: 'exact', head: true })
        .eq('received_date', receivedDate);
      
      const sequentialNumber = (count || 0) + 1;
      const grnNumber = `GRN-${dateStr}-${String(sequentialNumber).padStart(3, '0')}`;

      const { data: poItems } = await supabase
        .from('po_items')
        .select('*')
        .eq('po_id', po.id);

      if (!poItems || poItems.length === 0) continue;

      const { data: grn, error: grnError } = await supabase
        .from('grns')
        .insert({
          grn_number: grnNumber,
          po_id: po.id,
          received_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          received_by: 'Test User',
          status: 'completed',
          notes: `Test GRN ${i + 1}`,
        })
        .select()
        .single();

      if (grnError) {
        errors.push(`GRN ${i + 1}: ${grnError.message}`);
        continue;
      }

      createdGRNs.push(grn);

      // Create GRN items and stock movements
      for (const poItem of poItems) {
        if ((poItem.quantity_received || 0) > 0) {
          const { error: grnItemError } = await supabase.from('grn_items').insert({
            grn_id: grn.id,
            po_item_id: poItem.id,
            ingredient_id: poItem.ingredient_id,
            quantity_ordered: poItem.quantity_ordered,
            quantity_received: poItem.quantity_received,
            unit_price_ordered: poItem.unit_price,
            unit_price_actual: poItem.unit_price,
          });

          if (grnItemError) {
            errors.push(`GRN item: ${grnItemError.message}`);
          } else {
            createdCounts.grn_items = (createdCounts.grn_items || 0) + 1;
          }

          // Create stock movement
          try {
            const movementResult = await supabase.rpc('record_stock_movement', {
              p_ingredient_id: poItem.ingredient_id,
              p_movement_type: 'in',
              p_quantity: poItem.quantity_received,
              p_reference_type: 'grn',
              p_reference_id: grn.id,
              p_unit_cost: poItem.unit_price,
              p_remarks: `Test: PO ${po.po_number}, GRN ${grnNumber}`,
              p_movement_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            });

            if (movementResult.error) {
              // If RPC fails, create stock movement manually
              const { error: manualMovementError } = await supabase
                .from('stock_movements')
                .insert({
                  ingredient_id: poItem.ingredient_id,
                  movement_type: 'in',
                  quantity: poItem.quantity_received,
                  reference_type: 'grn',
                  reference_id: grn.id,
                  unit_cost: poItem.unit_price,
                  remarks: `Test: PO ${po.po_number}, GRN ${grnNumber}`,
                  movement_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
                });

              if (!manualMovementError) {
                createdCounts.stock_movements = (createdCounts.stock_movements || 0) + 1;
              }
            } else {
              createdCounts.stock_movements = (createdCounts.stock_movements || 0) + 1;
            }
          } catch (movementError) {
            // Try manual creation if RPC doesn't exist
            try {
              const { error: manualMovementError } = await supabase
                .from('stock_movements')
                .insert({
                  ingredient_id: poItem.ingredient_id,
                  movement_type: 'in',
                  quantity: poItem.quantity_received,
                  reference_type: 'grn',
                  reference_id: grn.id,
                  unit_cost: poItem.unit_price,
                  remarks: `Test: PO ${po.po_number}, GRN ${grnNumber}`,
                  movement_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
                });

              if (!manualMovementError) {
                createdCounts.stock_movements = (createdCounts.stock_movements || 0) + 1;
              }
            } catch (manualError) {
              console.warn('Failed to create stock movement:', manualError);
            }
          }
        }
      }
    }

    createdCounts.grns = createdGRNs.length;

    // 4. Create Payments
    console.log('Creating payments...');
    for (let i = 0; i < Math.min(2, createdPOs.length); i++) {
      const po = createdPOs[i];
      const paymentAmount = Math.round((po.total_amount || 0) * (i === 0 ? 1 : 0.5));

      if (paymentAmount > 0) {
        // Generate payment number
        let paymentNumber: string;
        try {
          const { data: paymentNumberData } = await supabase.rpc('generate_payment_number');
          paymentNumber = paymentNumberData || `PAY-${Date.now()}-${i}`;
        } catch {
          // Fallback: generate manually
          const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
          paymentNumber = `PAY-${dateStr}-${String(i + 1).padStart(4, '0')}`;
        }

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            payment_number: paymentNumber,
            po_id: po.id,
            vendor_id: vendorId,
            payment_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            amount: Math.round(paymentAmount), // Apply 0 decimal policy
            payment_method: i === 0 ? 'bank_transfer' : 'cash',
            status: 'completed',
            transaction_reference: `TXN-${Date.now()}-${i}`,
          })
          .select()
          .single();

        if (paymentError) {
          errors.push(`Payment ${i + 1}: ${paymentError.message}`);
        } else {
          createdCounts.payments = (createdCounts.payments || 0) + 1;
        }
      }
    }

    // 5. Create Sales
    console.log('Creating sales...');
    if (recipes.length > 0) {
      for (let i = 0; i < 10; i++) {
        const saleDate = new Date(Date.now() - i * 86400000);
        const itemsCount = Math.min(3, recipes.length);
        const selectedRecipes = recipes.slice(0, itemsCount);

        // Generate sale number
        const dateStr = saleDate.toISOString().split('T')[0].replace(/-/g, '');
        const saleNumber = `SALE-${dateStr}-${String(i + 1).padStart(3, '0')}`;

        const saleItems = selectedRecipes.map((recipe) => {
          const quantity = Math.round(1 + Math.random() * 5);
          const sellingPrice = recipe.selling_price || 100;
          const costPerPortion = Math.round(sellingPrice * 0.6); // Assume 60% cost
          return {
            recipe_id: recipe.id,
            quantity,
            selling_price: sellingPrice,
            cost_per_portion: costPerPortion,
            total_revenue: quantity * sellingPrice,
            total_cost: quantity * costPerPortion,
            profit: quantity * (sellingPrice - costPerPortion),
          };
        });

        const totalRevenue = saleItems.reduce((sum, item) => sum + item.total_revenue, 0);
        const totalCost = saleItems.reduce((sum, item) => sum + item.total_cost, 0);
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            sale_number: saleNumber,
            sale_date: saleDate.toISOString().split('T')[0],
            total_revenue: Math.round(totalRevenue), // Apply 0 decimal policy
            total_cost: Math.round(totalCost), // Apply 0 decimal policy
            gross_profit: Math.round(grossProfit), // Apply 0 decimal policy
            profit_margin: Math.round(profitMargin),
            status: 'processed',
            notes: `Test sale ${i + 1}`,
          })
          .select()
          .single();

        if (saleError) {
          errors.push(`Sale ${i + 1}: ${saleError.message}`);
          continue;
        }

        createdCounts.sales = (createdCounts.sales || 0) + 1;

        // Create sale items
        const saleItemsData = saleItems.map((item) => ({
          sale_id: sale.id,
          recipe_id: item.recipe_id,
          quantity: item.quantity,
          selling_price: item.selling_price,
          cost_per_portion: item.cost_per_portion,
          total_revenue: item.total_revenue,
          total_cost: item.total_cost,
          profit: item.profit,
        }));

        const { error: saleItemsError } = await supabase.from('sale_items').insert(saleItemsData);
        if (saleItemsError) {
          errors.push(`Sale items ${i + 1}: ${saleItemsError.message}`);
        } else {
          createdCounts.sale_items = (createdCounts.sale_items || 0) + saleItemsData.length;
        }

        // Create production consumption
        if (ingredients.length > 0) {
          const consumptionItems = ingredients.slice(0, Math.min(3, ingredients.length)).map((ing) => {
            const qty = Math.round(1 + Math.random() * 10);
            const costPerUnit = Math.round(10 + Math.random() * 50);
            return {
              sale_id: sale.id,
              ingredient_id: ing.id,
              quantity_consumed: qty,
              unit: ing.unit,
              cost_per_unit: costPerUnit,
              total_cost: Math.round(qty * costPerUnit), // Apply 0 decimal policy
            };
          });

          const { error: consumptionError } = await supabase
            .from('production_consumption')
            .insert(consumptionItems);

          if (consumptionError) {
            errors.push(`Production consumption ${i + 1}: ${consumptionError.message}`);
          } else {
            createdCounts.production_consumption = (createdCounts.production_consumption || 0) + consumptionItems.length;
          }
        }
      }
    }

    // 6. Create Other Expenses
    console.log('Creating other expenses...');
    if (expenseCategories.length > 0) {
      for (let i = 0; i < 8; i++) {
        const category = expenseCategories[i % expenseCategories.length];
        const amount = Math.round(1000 + Math.random() * 5000);
        const taxAmount = Math.round(amount * 0.18); // 18% tax
        const totalAmount = amount + taxAmount;

        const { data: expense, error: expenseError } = await supabase
          .from('other_expenses')
          .insert({
            expense_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            category_id: category.id,
            vendor_id: i % 3 === 0 ? vendorId : null,
            amount: amount,
            tax_amount: taxAmount,
            notes: `Test expense ${i + 1}`,
          })
          .select()
          .single();

        if (expenseError) {
          errors.push(`Expense ${i + 1}: ${expenseError.message}`);
          continue;
        }

        createdCounts.other_expenses = (createdCounts.other_expenses || 0) + 1;

        // Create expense payments for some expenses
        if (i % 2 === 0) {
          const paymentAmount = i % 4 === 0 ? totalAmount : Math.round(totalAmount * 0.5);

          const { error: expPaymentError } = await supabase
            .from('other_expense_payments')
            .insert({
              expense_id: expense.id,
              payment_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
              amount: paymentAmount,
              method: i % 2 === 0 ? 'cash' : 'bank_transfer',
              reference: `EXP-PAY-${Date.now()}-${i}`,
            });

          if (expPaymentError) {
            errors.push(`Expense payment ${i + 1}: ${expPaymentError.message}`);
          } else {
            createdCounts.other_expense_payments = (createdCounts.other_expense_payments || 0) + 1;
          }
        }
      }
    }

    // 7. Create Stock Adjustments
    console.log('Creating stock adjustments...');
    if (ingredients.length > 0) {
      for (let i = 0; i < 3; i++) {
        const ingredient = ingredients[i % ingredients.length];
        const adjustmentType = i % 2 === 0 ? 'increase' : 'decrease';
        const quantity = Math.round(5 + Math.random() * 20);

        const { error: adjustmentError } = await supabase
          .from('stock_adjustments')
          .insert({
            ingredient_id: ingredient.id,
            adjustment_type: adjustmentType,
            quantity: quantity,
            reason: `Test adjustment ${i + 1}`,
            adjusted_by: 'Test User',
            adjustment_date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          });

        if (adjustmentError) {
          errors.push(`Stock adjustment ${i + 1}: ${adjustmentError.message}`);
        } else {
          createdCounts.stock_adjustments = (createdCounts.stock_adjustments || 0) + 1;
        }
      }
    }

    const totalCreated = Object.values(createdCounts).reduce((sum, count) => sum + count, 0);

    console.log('✅ Seeding complete. Total records created:', totalCreated);
    console.log('Created counts:', createdCounts);

    return NextResponse.json({
      success: true,
      message: 'Transaction data seeded successfully',
      createdCounts,
      totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('❌ Error seeding transaction data:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed transaction data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

