-- Update the status CHECK constraint on intends table
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Run this entire script in one go

BEGIN;

-- Step 1: Drop the existing constraint FIRST (this will allow us to update data freely)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop all check constraints on the status column
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'intends'::regclass
        AND contype = 'c'
        AND (
            conname = 'intends_status_check' 
            OR pg_get_constraintdef(oid) LIKE '%status%'
        )
    ) LOOP
        EXECUTE 'ALTER TABLE intends DROP CONSTRAINT ' || quote_ident(r.conname) || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Step 2: Now update all existing intends to use the new status values
-- (This is safe now because the constraint is dropped)
UPDATE intends 
SET status = 'intend_generated' 
WHERE status IN ('draft', 'submitted', 'approved')
  AND (converted_to_po = false OR converted_to_po IS NULL);

UPDATE intends 
SET status = 'po_generated' 
WHERE status = 'ordered' OR converted_to_po = true;

-- Also update any rows that might have null status (shouldn't happen, but just in case)
UPDATE intends 
SET status = 'intend_generated' 
WHERE status IS NULL OR status = '';

-- Step 3: Add the new constraint with updated status values
ALTER TABLE intends
ADD CONSTRAINT intends_status_check
CHECK (status IN ('intend_generated', 'po_generated'));

-- Step 4: Verify the constraint was added correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'intends'::regclass
AND conname = 'intends_status_check';

-- Step 5: Verify all rows have valid status values
SELECT 
    status,
    COUNT(*) as count
FROM intends
GROUP BY status;

COMMIT;

