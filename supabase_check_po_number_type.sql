-- Diagnostic script to check po_number column type
-- Run this in Supabase SQL Editor to check if the column type is correct

-- Check the current column type
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
  AND column_name = 'po_number';

-- If po_number is INTEGER, we need to change it to TEXT/VARCHAR
-- Run the ALTER TABLE command below ONLY if the column type is INTEGER

-- ALTER TABLE purchase_orders 
-- ALTER COLUMN po_number TYPE TEXT USING po_number::TEXT;

-- After changing the column type, you may want to add a constraint to ensure format
-- ALTER TABLE purchase_orders
-- ADD CONSTRAINT po_number_format CHECK (po_number ~ '^PO-\d{4}-\d{5}$');






