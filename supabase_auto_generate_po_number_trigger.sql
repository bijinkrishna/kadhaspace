-- Auto-generate PO number trigger
-- This ensures PO numbers are always auto-generated, even if not provided in insert
-- Run this in your Supabase SQL Editor

-- Function to generate PO number if not provided
CREATE OR REPLACE FUNCTION generate_po_number_if_null()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  year_prefix TEXT;
  date_str TEXT;
  today_str TEXT;
  po_count INTEGER;
  sequential_number INTEGER;
  new_po_number TEXT;
BEGIN
  -- Only generate if po_number is NULL or empty
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    -- Get current date
    today_str := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
    date_str := REPLACE(today_str, '-', ''); -- YYYYMMDD
    
    -- Count POs created today
    SELECT COUNT(*)
    INTO po_count
    FROM purchase_orders
    WHERE created_at >= (today_str || 'T00:00:00.000Z')::timestamp
      AND created_at <= (today_str || 'T23:59:59.999Z')::timestamp;
    
    sequential_number := po_count + 1;
    new_po_number := 'PO-' || date_str || '-' || LPAD(sequential_number::TEXT, 3, '0');
    
    -- Check if this number already exists (race condition protection)
    WHILE EXISTS (SELECT 1 FROM purchase_orders WHERE po_number = new_po_number) LOOP
      sequential_number := sequential_number + 1;
      new_po_number := 'PO-' || date_str || '-' || LPAD(sequential_number::TEXT, 3, '0');
    END LOOP;
    
    NEW.po_number := new_po_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_generate_po_number ON purchase_orders;

-- Create trigger that fires BEFORE INSERT
CREATE TRIGGER auto_generate_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_po_number_if_null();

