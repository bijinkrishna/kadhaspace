import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Simple token validation (in production, use proper JWT validation)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [username] = decoded.split(':');
      
      if (!username) {
        return NextResponse.json(
          { authenticated: false },
          { status: 401 }
        );
      }

      // Query user from database to validate existence and get role
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('username', username)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { authenticated: false },
          { status: 401 }
        );
      }

      return NextResponse.json({
        authenticated: true,
        role: user.role,
        username: user.username,
      });
    } catch {
      // Invalid token
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

