import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch intend basic info
    const { data: intend, error: intendError } = await supabase
      .from('intends')
      .select('*')
      .eq('id', id)
      .single();

    if (intendError) throw intendError;
    if (!intend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Fetch vendor if assigned
    let vendor = null;
    if (intend.vendor_id) {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id, name, contact, email')
        .eq('id', intend.vendor_id)
        .single();
      if (vendorError) {
        console.error('Error fetching vendor:', vendorError);
        // Continue without vendor rather than failing
      } else {
        vendor = vendorData;
      }
    }

    // Fetch items with ingredient details
    const { data: items, error: itemsError } = await supabase
      .from('intend_items')
      .select(`
        id,
        ingredient_id,
        quantity,
        remarks,
        ingredients (
          id,
          name,
          unit,
          last_price
        )
      `)
      .eq('intend_id', id);

    if (itemsError) throw itemsError;

    // Check which items are in POs
    // Get all intend item IDs
    const itemIds = items?.map(item => item.id) || [];
    let poMap: Record<string, { 
      po_number: string | null; 
      po_status: string | null;
      quantity_ordered: number | null;
      unit_price: number | null;
    }> = {};

    if (itemIds.length > 0) {
      // Fetch PO items that reference these intend items
      const { data: poLinks, error: poLinksError } = await supabase
        .from('po_items')
        .select(`
          intend_item_id,
          po_id,
          quantity_ordered,
          unit_price,
          purchase_orders (
            po_number,
            status
          )
        `)
        .in('intend_item_id', itemIds)
        .not('intend_item_id', 'is', null);

      if (poLinksError) {
        console.error('Error fetching PO links:', poLinksError);
        // Continue without PO info rather than failing
      } else {
        console.log('PO links fetched:', poLinks); // Debug log

        // Create map of intend_item_id → PO details
        poLinks?.forEach((link: any) => {
          const poDetails = link.purchase_orders;
          // Handle both array and object response from Supabase
          const poData = Array.isArray(poDetails) ? poDetails[0] : poDetails;
          if (link.intend_item_id) {
            poMap[link.intend_item_id] = {
              po_number: poData?.po_number || null,
              po_status: poData?.status || null,
              quantity_ordered: link.quantity_ordered || null,  // THIS IS THE KEY FIELD
              unit_price: link.unit_price || null
            };
          }
        });
      }
    }

    console.log('PO map created:', poMap); // Debug log

    // Format items with PO information
    const formattedItems = items?.map((item: any) => {
      const poInfo = poMap[item.id];
      const isInPo = !!poInfo;
      
      // Handle ingredients - Supabase can return object or array
      const ingredient = Array.isArray(item.ingredients) 
        ? item.ingredients[0] 
        : item.ingredients;

      return {
        id: item.id,
        ingredient_id: item.ingredient_id,
        ingredient_name: ingredient?.name || 'Unknown',
        unit: ingredient?.unit || '-',
        quantity: item.quantity,  // Original intend quantity
        quantity_ordered: poInfo?.quantity_ordered || null,  // Actual PO quantity
        unit_price: poInfo?.unit_price || ingredient?.last_price || 0,
        last_price: ingredient?.last_price || 0,
        remarks: item.remarks || null,
        in_po: isInPo,
        po_number: poInfo?.po_number || null,
        po_status: poInfo?.po_status || null
      };
    }) || [];

    console.log('Formatted items:', formattedItems); // Debug log

    return NextResponse.json({
      ...intend,
      vendor,
      items: formattedItems
    });

  } catch (error) {
    console.error('Error fetching intend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intend details' },
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
    const { vendor_id, status, notes } = body;

    // Check if intend exists
    const { data: existingIntend, error: fetchError } = await supabase
      .from('intends')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingIntend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Validate status transitions if status is being updated
    if (status !== undefined && status !== existingIntend.status) {
      const currentStatus = existingIntend.status;
      const newStatus = status;

      // Validate allowed transitions
      const allowedTransitions: Record<string, string[]> = {
        draft: ['submitted'],
        submitted: ['approved', 'draft'],
        approved: ['submitted'],
      };

      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};

    if (vendor_id !== undefined) {
      if (vendor_id !== null && typeof vendor_id !== 'string') {
        return NextResponse.json(
          { error: 'vendor_id must be a string or null' },
          { status: 400 }
        );
      }
      // If vendor_id is provided, verify it exists (unless it's null)
      if (vendor_id !== null && vendor_id !== '') {
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('id', vendor_id)
          .single();

        if (vendorError || !vendor) {
          return NextResponse.json(
            { error: 'Vendor not found' },
            { status: 400 }
          );
        }
      }
      updateData.vendor_id = vendor_id === '' ? null : vendor_id;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'submitted', 'approved'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Allowed values: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== 'string') {
        return NextResponse.json(
          { error: 'Notes must be a string or null' },
          { status: 400 }
        );
      }
      updateData.notes = notes === null || notes.trim() === '' ? null : notes.trim();
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('intends')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating intend:', error);
      return NextResponse.json(
        { error: 'Failed to update intend' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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

    // Check if intend exists
    const { data: existingIntend, error: fetchError } = await supabase
      .from('intends')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingIntend) {
      return NextResponse.json(
        { error: 'Intend not found' },
        { status: 404 }
      );
    }

    // Delete the intend (cascade will delete items)
    const { error: deleteError } = await supabase
      .from('intends')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting intend:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete intend' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Intend deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

