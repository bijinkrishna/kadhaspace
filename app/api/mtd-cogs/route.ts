import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';



const supabase = createClient(

  process.env.NEXT_PUBLIC_SUPABASE_URL!,

  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

);



// GET /api/mtd-cogs?start_date=2025-11-01&end_date=2025-11-15

export async function GET(request: Request) {

  try {

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('start_date');

    const endDate = searchParams.get('end_date');



    let data, error;



    if (startDate && endDate) {

      // Custom date range

      const result = await supabase.rpc('get_cogs_for_period', {

        p_start_date: startDate,

        p_end_date: endDate

      }).single();

      

      data = result.data;

      error = result.error;

    } else {

      // Default MTD

      const result = await supabase.rpc('get_mtd_cogs').single();

      data = result.data;

      error = result.error;

    }



    if (error) throw error;



    return NextResponse.json(data || {}, {

      headers: {

        'Cache-Control': 'no-store',

      }

    });



  } catch (error: any) {

    console.error('Error fetching COGS:', error);

    return NextResponse.json(

      { error: 'Failed to fetch COGS', message: error.message },

      { status: 500 }

    );

  }

}
