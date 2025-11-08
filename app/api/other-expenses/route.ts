import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const category = req.nextUrl.searchParams.get('category');

  let q = supabase
    .from('other_expenses')
    .select('*, category:expense_categories(name, code), vendor:vendors(name)')
    .order('expense_date', { ascending: false });

  if (from) q = q.gte('expense_date', from);
  if (to) q = q.lte('expense_date', to);
  if (category) {
    const {
      data: cat,
      error: catError,
    } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('code', category)
      .maybeSingle();

    if (catError)
      return NextResponse.json({ error: catError.message }, { status: 500 });
    if (!cat)
      return NextResponse.json(
        { error: 'Invalid category code' },
        { status: 400 }
      );

    if (cat?.id) q = q.eq('category_id', cat.id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  let category_id = body.category_id;

  if (!category_id && body.category_code) {
    const {
      data: cat,
      error: catError,
    } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('code', body.category_code)
      .maybeSingle();

    if (catError)
      return NextResponse.json({ error: catError.message }, { status: 500 });
    if (!cat?.id)
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    category_id = cat.id;
  }

  if (!category_id)
    return NextResponse.json(
      { error: 'Category is required' },
      { status: 400 }
    );

  const parsedAmount = Number(body.amount);
  if (!Number.isFinite(parsedAmount))
    return NextResponse.json(
      { error: 'Amount must be a valid number' },
      { status: 400 }
    );

  const parsedTaxAmount =
    body.tax_amount === undefined ? 0 : Number(body.tax_amount);
  if (!Number.isFinite(parsedTaxAmount))
    return NextResponse.json(
      { error: 'Tax amount must be a valid number' },
      { status: 400 }
    );

  const payload = {
    expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
    category_id,
    vendor_id: body.vendor_id || null,
    amount: Math.round(parsedAmount), // Apply 0 decimal policy
    tax_amount: Math.round(parsedTaxAmount), // Apply 0 decimal policy
    notes: body.notes || null,
    attachment_url: body.attachment_url || null,
  };

  const { data, error } = await supabase
    .from('other_expenses')
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

