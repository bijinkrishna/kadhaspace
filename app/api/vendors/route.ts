import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Vendor } from '@/types';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching vendors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vendors' },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact, email, address } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!contact || typeof contact !== 'string' || contact.trim() === '') {
      return NextResponse.json(
        { error: 'Contact is required' },
        { status: 400 }
      );
    }

    // Validate optional fields
    const insertData: Partial<Vendor> = {
      name: name.trim(),
      contact: contact.trim(),
    };

    if (email !== undefined && email !== null) {
      if (typeof email !== 'string') {
        return NextResponse.json(
          { error: 'Email must be a string or null' },
          { status: 400 }
        );
      }
      insertData.email = email.trim() === '' ? null : email.trim();
    } else {
      insertData.email = null;
    }

    if (address !== undefined && address !== null) {
      if (typeof address !== 'string') {
        return NextResponse.json(
          { error: 'Address must be a string or null' },
          { status: 400 }
        );
      }
      insertData.address = address.trim() === '' ? null : address.trim();
    } else {
      insertData.address = null;
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating vendor:', error);
      return NextResponse.json(
        { error: 'Failed to create vendor' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

