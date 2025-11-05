-- Function to generate adjustment number in format: ADJ-YYYYMM or ADJ-YYYYMM-N
-- Run this in your Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_adjustment_number();

-- Create the function
CREATE OR REPLACE FUNCTION generate_adjustment_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  adjustment_number_text TEXT;
  current_year TEXT;
  current_month TEXT;
  base_number TEXT;
  max_sequence INTEGER;
BEGIN
  -- Get current year and month
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  current_month := TO_CHAR(CURRENT_DATE, 'MM');
  base_number := 'ADJ-' || current_year || current_month;
  
  -- Find the maximum sequence number for this month/year
  -- First, check if base number exists (count as sequence 0)
  -- Then check for numbered sequences (ADJ-YYYYMM-N)
  SELECT COALESCE(
    MAX(
      CASE 
        -- If it's exactly the base number, treat as sequence 0
        WHEN adjustment_number = base_number THEN 0
        -- If it starts with base_number and has a dash, extract the number after
        WHEN adjustment_number LIKE base_number || '-%' THEN
          CAST(SUBSTRING(adjustment_number FROM LENGTH(base_number) + 2) AS INTEGER)
        ELSE -1
      END
    ), -1
  ) + 1
  INTO max_sequence
  FROM stock_adjustments
  WHERE adjustment_number LIKE base_number || '%';
  
  -- Format the adjustment number
  -- If max_sequence is 0 (nothing exists for this month), use base number (ADJ-YYYYMM)
  -- Otherwise, use base number with sequence (ADJ-YYYYMM-N)
  IF max_sequence <= 0 THEN
    adjustment_number_text := base_number;
  ELSE
    adjustment_number_text := base_number || '-' || max_sequence::TEXT;
  END IF;
  
  RETURN adjustment_number_text;
END;
$$ LANGUAGE plpgsql;

