# SQL Functions Setup

This application requires the following SQL functions to be created in your Supabase database. Run these scripts in your Supabase SQL Editor.

## 1. Generate PO Number Function

**File:** `supabase_fix_generate_po_number.sql`

This function generates purchase order numbers in the format: `PO-YYYY-NNNNN` (e.g., `PO-2025-00001`)

```sql
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_po_number();

-- Create the corrected function
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  po_number_text TEXT;
  current_year TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Find the highest PO number for this year and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 7) AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || current_year || '-%';
  
  -- Format the PO number: PO-YYYY-NNNNN
  po_number_text := 'PO-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN po_number_text;
END;
$$ LANGUAGE plpgsql;
```

## 2. Generate Intend ID Function

**File:** `supabase_generate_intend_id.sql`

This function generates intend IDs in the format: `001-NOV-2025` (sequential number + month + year)

```sql
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_intend_id();

-- Create the function
CREATE OR REPLACE FUNCTION generate_intend_id()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  intend_id_text TEXT;
  current_year TEXT;
  current_month TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get current month abbreviation (uppercase)
  current_month := UPPER(TO_CHAR(CURRENT_DATE, 'Mon'));
  
  -- Find the highest intend number for this month/year and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(intend_number FROM 1 FOR 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM intends
  WHERE intend_number IS NOT NULL
    AND intend_number LIKE '___-' || current_month || '-' || current_year;
  
  -- Format the intend ID: NNN-MON-YYYY
  intend_id_text := LPAD(next_number::TEXT, 3, '0') || '-' || current_month || '-' || current_year;
  
  RETURN intend_id_text;
END;
$$ LANGUAGE plpgsql;
```

## 3. Update Intend Status Constraint

**File:** `supabase_update_intend_status_constraint.sql`

This script updates the status constraint to allow new status values.

## Setup Instructions

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from each file
4. Run each script one by one
5. Verify the functions exist by running:
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('generate_po_number', 'generate_intend_id');
   ```

## Troubleshooting

If you get "function does not exist" errors:
- Make sure you've run all the SQL scripts above
- Check that the functions are created in the correct schema (usually `public`)
- Verify the function names match exactly (case-sensitive)





