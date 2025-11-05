-- Fix for generate_po_number function to correctly extract numeric part
-- Run this in your Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_po_number();

-- Create the corrected function
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  po_number_text TEXT;
  current_year TEXT;
  year_prefix TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  year_prefix := 'PO-' || current_year || '-';
  
  -- Find the highest PO number for this year and increment
  -- Extract the numeric part after "PO-YYYY-" (using SUBSTRING with calculated position)
  -- Explicitly reference purchase_orders.po_number to avoid ambiguity
  SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_orders.po_number FROM LENGTH(year_prefix) + 1) AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE purchase_orders.po_number LIKE year_prefix || '%';
  
  -- Format the PO number: PO-YYYY-NNNNN
  po_number_text := year_prefix || LPAD(next_number::TEXT, 5, '0');
  
  RETURN po_number_text;
END;
$$ LANGUAGE plpgsql;

