-- Test script to verify generate_po_number() function exists and works
-- Run this in Supabase SQL Editor to test the function

-- 1. Check if function exists
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'generate_po_number';

-- 2. Test the function
SELECT generate_po_number() as test_po_number;

-- 3. Check function permissions (if needed)
SELECT 
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner,
    has_function_privilege('public', p.oid, 'EXECUTE') as public_can_execute
FROM pg_proc p
WHERE p.proname = 'generate_po_number';






