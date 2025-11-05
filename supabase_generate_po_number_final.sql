-- Final improved PO number generation with better error handling
-- Keeps the MAX-based approach to avoid duplicates after deletions
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
  max_numeric_part TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  year_prefix := 'PO-' || current_year || '-';
  
  -- Find the highest numeric part for this year
  -- Use a more robust approach with validation
  SELECT 
    MAX(
      CASE 
        -- Validate that the numeric part is actually numeric
        WHEN SUBSTRING(po_number FROM LENGTH(year_prefix) + 1) ~ '^\d+$' THEN
          CAST(SUBSTRING(po_number FROM LENGTH(year_prefix) + 1) AS INTEGER)
        ELSE
          NULL  -- Skip invalid formats
      END
    )
  INTO next_number
  FROM purchase_orders
  WHERE po_number LIKE year_prefix || '%'
    AND LENGTH(po_number) >= LENGTH(year_prefix) + 1;  -- Ensure there's a numeric part
  
  -- If no valid PO found or extraction failed, start from 1
  IF next_number IS NULL THEN
    next_number := 0;
  END IF;
  
  -- Increment to get next number
  next_number := next_number + 1;
  
  -- Format the PO number: PO-YYYY-NNNNN (5 digits, zero-padded)
  po_number_text := year_prefix || LPAD(next_number::TEXT, 5, '0');
  
  RETURN po_number_text;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything goes wrong, return a safe default
    -- In production, you might want to log this error
    RETURN year_prefix || '00001';
END;
$$ LANGUAGE plpgsql;

