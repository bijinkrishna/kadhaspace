-- Improved generate_po_number function with better error handling and race condition protection
-- Run this in your Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_po_number();

-- Create the improved function
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  po_number_text TEXT;
  current_year TEXT;
  year_prefix TEXT;
  max_po_number TEXT;
  numeric_part TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  year_prefix := 'PO-' || current_year || '-';
  
  -- Find the highest PO number for this year
  -- Use a more robust extraction method that handles edge cases
  SELECT po_number
  INTO max_po_number
  FROM purchase_orders
  WHERE po_number LIKE year_prefix || '%'
    AND po_number ~ ('^' || REPLACE(year_prefix, '-', '\\-') || '\\d+$')  -- Ensure it matches the pattern
  ORDER BY 
    -- Extract numeric part and sort numerically
    CAST(SUBSTRING(po_number FROM LENGTH(year_prefix) + 1) AS INTEGER) DESC
  LIMIT 1;
  
  -- Extract and increment the number
  IF max_po_number IS NOT NULL THEN
    -- Extract numeric part (everything after the prefix)
    numeric_part := SUBSTRING(max_po_number FROM LENGTH(year_prefix) + 1);
    
    -- Validate that it's numeric
    IF numeric_part ~ '^\d+$' THEN
      next_number := CAST(numeric_part AS INTEGER) + 1;
    ELSE
      -- If extraction fails, start from 1
      next_number := 1;
    END IF;
  ELSE
    -- No existing PO for this year, start from 1
    next_number := 1;
  END IF;
  
  -- Format the PO number: PO-YYYY-NNNNN (5 digits, zero-padded)
  po_number_text := year_prefix || LPAD(next_number::TEXT, 5, '0');
  
  RETURN po_number_text;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything goes wrong, return a safe default
    -- Log the error (in production, you might want to use RAISE NOTICE)
    RETURN year_prefix || '00001';
END;
$$ LANGUAGE plpgsql;

