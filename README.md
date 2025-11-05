# Kadha Cafe - Inventory Management System

This is a [Next.js](https://nextjs.org) project for inventory management at Kadha Cafe.

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. A Supabase project set up
3. Environment variables configured (see below)

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

### Required SQL Functions

**IMPORTANT:** You must run the SQL scripts below in your Supabase SQL Editor before using the application.

### 1. Generate PO Number Function

Run the script in `supabase_fix_generate_po_number.sql` or use the combined script below.

### 2. Generate Intend ID Function

Run the script in `supabase_generate_intend_id.sql` or use the combined script below.

### 3. Combined Setup (Recommended)

Run the complete script in `supabase_setup_all_functions.sql` which creates all required functions at once.

**Quick Setup:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase_setup_all_functions.sql`
3. Click Run
4. Verify functions were created:
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('generate_po_number', 'generate_intend_id');
   ```

### 4. Update Intend Status Constraint

Run `supabase_update_intend_status_constraint.sql` to update the status constraint.

### 5. Add Intend Number Column

If the `intend_number` column doesn't exist in your `intends` table:

```sql
ALTER TABLE intends ADD COLUMN IF NOT EXISTS intend_number TEXT;
```

## Troubleshooting

### "Failed to generate PO number" Error

This error can occur for two reasons:

1. **SQL Function Missing:** The `generate_po_number()` SQL function doesn't exist.
   - **Solution:** Run the SQL script in `supabase_setup_all_functions.sql` in your Supabase SQL Editor.

2. **Column Type Mismatch:** The `po_number` column in the `purchase_orders` table is INTEGER instead of TEXT.
   - **Check:** Run `supabase_check_po_number_type.sql` to see the current column type.
   - **Fix:** Run `supabase_fix_po_number_column.sql` to change INTEGER to TEXT.

### "Failed to generate intend ID" Error

This error means the `generate_intend_id()` SQL function is missing.

**Solution:** Run the SQL script in `supabase_setup_all_functions.sql` in your Supabase SQL Editor.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
