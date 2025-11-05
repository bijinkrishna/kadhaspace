-- Complete SQL Setup Script for All Required Functions
-- Run this entire script in your Supabase SQL Editor
-- This will create all necessary functions for the application

-- ============================================
-- 1. Generate PO Number Function
-- ============================================
DROP FUNCTION IF EXISTS generate_po_number();

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

-- ============================================
-- 2. Generate Intend ID Function
-- ============================================
DROP FUNCTION IF EXISTS generate_intend_id();

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

-- ============================================
-- 3. Verify Functions Were Created
-- ============================================
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname IN ('generate_po_number', 'generate_intend_id')
ORDER BY proname;

