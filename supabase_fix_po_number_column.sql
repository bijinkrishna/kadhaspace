-- Fix po_number column type if it's INTEGER
-- This script will:
-- 1. Check the current column type
-- 2. Change it to TEXT if it's INTEGER
-- 3. Verify the change

-- Step 1: Check current type
DO $$
DECLARE
    current_type TEXT;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'purchase_orders' 
      AND column_name = 'po_number';
    
    RAISE NOTICE 'Current po_number column type: %', current_type;
    
    -- Step 2: If it's integer, change to text
    IF current_type = 'integer' THEN
        ALTER TABLE purchase_orders 
        ALTER COLUMN po_number TYPE TEXT USING po_number::TEXT;
        
        RAISE NOTICE 'Changed po_number column type from INTEGER to TEXT';
    ELSE
        RAISE NOTICE 'po_number column is already TEXT/VARCHAR. No changes needed.';
    END IF;
END $$;

-- Step 3: Verify the change
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
  AND column_name = 'po_number';






