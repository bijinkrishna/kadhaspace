import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch PO with all details including receipt status
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        actual_receivable_amount,
        total_items_count,
        received_items_count,
        received_percentage,
        vendors (*),
        po_items (
          id,
          ingredient_id,
          quantity_ordered,
          quantity_received,
          received_percentage,
          item_status,
          unit_price,
          total_price,
          intend_item_id,
          ingredients (
            name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase order not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Fetch intend name if intend_id exists
    let intendName = null;
    if (po.intend_id) {
      const { data: intendData, error: intendError } = await supabase
        .from('intends')
        .select('name')
        .eq('id', po.intend_id)
        .single();
      if (!intendError && intendData) {
        intendName = intendData.name;
      }
    }

    // Format items with ingredient details
    const itemsWithDetails = (po.po_items || []).map((item: any) => {
      // Handle ingredients - Supabase can return object or array
      const ingredient = Array.isArray(item.ingredients) 
        ? item.ingredients[0] 
        : item.ingredients;
      
      return {
        id: item.id,
        po_id: po.id,
        ingredient_id: item.ingredient_id,
        ingredient_name: ingredient?.name || 'Unknown',
        unit: ingredient?.unit || '-',
        quantity_ordered: item.quantity_ordered,
        quantity_received: item.quantity_received || 0,
        received_percentage: item.received_percentage || 0,
        item_status: item.item_status || 'pending',
        unit_price: item.unit_price,
        total_price: item.total_price,
        intend_item_id: item.intend_item_id || null
      };
    });

    // Transform response
    const result = {
      ...po,
      vendor: po.vendors || null,
      intend_name: intendName,
      items: itemsWithDetails
    };

    // Remove nested vendors from top level
    delete (result as any).vendors;
    delete (result as any).po_items;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching PO:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'received'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if purchase order exists
    const { data: existingPO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingPO) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const currentStatus = existingPO.status;
    const newStatus = status;

    // Allow transitions: pending -> confirmed -> received
    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed'],
      confirmed: ['received'],
      received: [], // Received is final
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ') || 'none'}`,
        },
        { status: 400 }
      );
    }

    // Update purchase order status
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating purchase order:', error);
      return NextResponse.json(
        { error: 'Failed to update purchase order' },
        { status: 500 }
      );
    }

    // Fetch updated PO with vendor details
    const { data: updatedPO, error: fetchUpdatedError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors (*)
      `)
      .eq('id', id)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching updated purchase order:', fetchUpdatedError);
      // Return basic data if fetch fails
      return NextResponse.json(data);
    }

    const purchaseOrder = {
      ...updatedPO,
      vendor: updatedPO.vendors || null,
    };

    delete (purchaseOrder as any).vendors;

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if purchase order exists and is pending
    const { data: existingPO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingPO) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if status is pending
    if (existingPO.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete purchase order. Only pending orders can be deleted.' },
        { status: 400 }
      );
    }

    // Delete the purchase order (cascade will delete items)
    const { error: deleteError } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting purchase order:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete purchase order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

