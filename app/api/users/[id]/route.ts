import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password';
import { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['admin', 'accounts', 'manager', 'staff'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
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
    const { username, password, role } = body;

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: {
      username?: string;
      password_hash?: string;
      role?: UserRole;
    } = {};

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim() === '') {
        return NextResponse.json(
          { error: 'Username must be a non-empty string' },
          { status: 400 }
        );
      }

      // Check if new username is different and already exists
      if (username.trim() !== existingUser.username) {
        const { data: usernameCheck } = await supabase
          .from('users')
          .select('id')
          .eq('username', username.trim())
          .maybeSingle();

        if (usernameCheck) {
          return NextResponse.json(
            { error: 'Username already exists' },
            { status: 409 }
          );
        }
      }

      updateData.username = username.trim();
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 4) {
        return NextResponse.json(
          { error: 'Password must be at least 4 characters' },
          { status: 400 }
        );
      }
      // Hash the new password
      updateData.password_hash = await hashPassword(password);
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { error: `Role must be one of: ${VALID_ROLES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.role = role as UserRole;
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
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

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current user from session (if available)
    // Note: We can't easily get the current user ID from the request here
    // without modifying the auth system, so we'll allow deletion
    // but document that the admin should be careful

    // Check if this is the last admin user
    const { data: adminUsers, error: adminCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (adminCheckError) {
      console.error('Error checking admin users:', adminCheckError);
      return NextResponse.json(
        { error: 'Failed to check admin users' },
        { status: 500 }
      );
    }

    // Prevent deletion if this is the last admin
    const { data: userToDelete } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (userToDelete?.role === 'admin' && adminUsers && adminUsers.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin user' },
        { status: 400 }
      );
    }

    // Delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


