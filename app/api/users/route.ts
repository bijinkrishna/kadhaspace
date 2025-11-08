import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password';
import { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['admin', 'accounts', 'manager', 'staff'];

export async function GET() {
  try {
    // Fetch all users, excluding password_hash for security
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at, updated_at')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
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
    const { username, password, role } = body;

    // Validate required fields
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 4 characters' },
        { status: 400 }
      );
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Role is required and must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: username.trim(),
        password_hash: passwordHash,
        role: role as UserRole,
      })
      .select('id, username, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: 'Failed to create user' },
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


