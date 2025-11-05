-- Function to generate intend ID in format: 001-NOV-2025
-- Run this in your Supabase SQL Editor

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

