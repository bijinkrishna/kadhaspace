import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { cookies } from 'next/headers';

import { NextResponse } from 'next/server';



export async function GET() {

  const supabase = createRouteHandlerClient({ cookies });



  // Get current user's role

  const { data: roleData, error: roleError } = await supabase

    .rpc('get_user_role');



  if (roleError || roleData !== 'admin') {

    return NextResponse.json(

      { error: 'Unauthorized' },

      { status: 403 }

    );

  }



  // Admin-only logic here

  return NextResponse.json({ 

    message: 'Admin access granted',

    // admin data can be added here

  });

}

