import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Vendor } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching vendor:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vendor' },
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contact, email, address } = body;

    // Check if vendor exists
    const { data: existingVendor, error: fetchError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Partial<Vendor> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (contact !== undefined) {
      if (typeof contact !== 'string' || contact.trim() === '') {
        return NextResponse.json(
          { error: 'Contact must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.contact = contact.trim();
    }

    if (email !== undefined) {
      if (email !== null && (typeof email !== 'string' || email.trim() === '')) {
        return NextResponse.json(
          { error: 'Email must be a string or null' },
          { status: 400 }
        );
      }
      updateData.email = email === null || email.trim() === '' ? null : email.trim();
    }

    if (address !== undefined) {
      if (address !== null && (typeof address !== 'string' || address.trim() === '')) {
        return NextResponse.json(
          { error: 'Address must be a string or null' },
          { status: 400 }
        );
      }
      updateData.address = address === null || address.trim() === '' ? null : address.trim();
    }

    const { data, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vendor:', error);
      return NextResponse.json(
        { error: 'Failed to update vendor' },
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

    // Check if vendor exists
    const { data: existingVendor, error: fetchError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check if vendor is referenced in intends
    const { data: intends, error: checkError } = await supabase
      .from('intends')
      .select('id')
      .eq('vendor_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking vendor references:', checkError);
      return NextResponse.json(
        { error: 'Failed to check vendor references' },
        { status: 500 }
      );
    }

    if (intends && intends.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor that is associated with an intend' },
        { status: 400 }
      );
    }

    // Delete the vendor
    const { error: deleteError } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting vendor:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete vendor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

