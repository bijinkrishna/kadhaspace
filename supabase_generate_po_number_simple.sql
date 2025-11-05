-- Simplified PO number generation using count-based approach (similar to adjustment numbers)
-- This approach is simpler and less prone to extraction errors
-- Run this in your Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_po_number();

-- Create the simplified function
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  po_number_text TEXT;
  current_year TEXT;
  year_prefix TEXT;
  po_count INTEGER;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  year_prefix := 'PO-' || current_year || '-';
  
  -- Count existing PO numbers for this year
  -- This is simpler and more reliable than extracting numeric parts
  SELECT COUNT(*)
  INTO po_count
  FROM purchase_orders
  WHERE po_number LIKE year_prefix || '%'
    AND po_number ~ ('^' || REPLACE(year_prefix, '-', '\\-') || '\\d{5}$');  -- Ensure format matches
  
  -- Next number is count + 1
  next_number := po_count + 1;
  
  -- Format the PO number: PO-YYYY-NNNNN (5 digits, zero-padded)
  po_number_text := year_prefix || LPAD(next_number::TEXT, 5, '0');
  
  RETURN po_number_text;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything goes wrong, return a safe default
    RETURN year_prefix || '00001';
END;
$$ LANGUAGE plpgsql;

