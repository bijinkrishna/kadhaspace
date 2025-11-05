# PO Number Sequencing Logic Analysis

## Current Implementation

The current `generate_po_number()` function uses the following logic:

1. **Format**: `PO-YYYY-NNNNN` (e.g., `PO-2025-00001`)
2. **Year-based sequencing**: Each year starts from `00001`
3. **Generation method**: Extracts numeric part from existing POs and increments

## Current Logic Flow

```sql
year_prefix = 'PO-2025-'  -- Length = 9
SUBSTRING(po_number FROM LENGTH(year_prefix) + 1)  -- FROM position 10
-- For "PO-2025-00001": extracts "00001"
CAST("00001" AS INTEGER)  -- Results in 1
MAX(1, 2, 3, ...)  -- Gets highest number
+ 1  -- Increments
LPAD(next_number, 5, '0')  -- Pads to 5 digits
```

## Potential Issues

### 1. **SUBSTRING Logic**
- ✅ **Works correctly** if all PO numbers follow exact format `PO-YYYY-NNNNN`
- ❌ **Fails if**:
  - PO numbers have different formats (e.g., `PO-2025-ABC-00001`)
  - Malformed data exists in database
  - Extra characters after the numeric part

### 2. **Race Condition**
- ❌ **Issue**: If two POs are created simultaneously:
  - Both see the same MAX value
  - Both generate the same next number
  - One will fail with duplicate key error
  
**Solution**: Use database-level locking or retry logic in application

### 3. **Error Handling**
- ❌ **Current**: No error handling if SUBSTRING or CAST fails
- ✅ **Should have**: Try-catch or validation before casting

### 4. **Year Transition**
- ✅ **Current**: Correctly resets to 00001 for new year
- ✅ **Logic**: Uses `CURRENT_DATE` to get current year

## Testing Scenarios

### Scenario 1: First PO of the year
- **Input**: No existing POs for 2025
- **Expected**: `PO-2025-00001`
- **Result**: ✅ Works (COALESCE returns 0, +1 = 1)

### Scenario 2: Sequential POs
- **Input**: Existing `PO-2025-00001`, `PO-2025-00002`
- **Expected**: `PO-2025-00003`
- **Result**: ✅ Works (MAX(1,2) = 2, +1 = 3)

### Scenario 3: Non-sequential numbers
- **Input**: Existing `PO-2025-00001`, `PO-2025-00005` (skipped numbers)
- **Expected**: `PO-2025-00006`
- **Result**: ✅ Works (MAX(1,5) = 5, +1 = 6)
- **Note**: This is correct behavior - fills gaps

### Scenario 4: Concurrent requests
- **Input**: Two simultaneous requests
- **Expected**: One gets `PO-2025-00003`, other gets `PO-2025-00004`
- **Result**: ❌ Both might get `PO-2025-00003` (race condition)
- **Impact**: One will fail with duplicate key constraint

## Recommendations

### Option 1: Add Error Handling (Quick Fix)
```sql
-- Add validation and error handling
-- See supabase_generate_po_number_improved.sql
```

### Option 2: Use Advisory Locks (Better Concurrency)
```sql
-- Use PostgreSQL advisory locks to prevent race conditions
-- More complex but handles concurrent requests properly
```

### Option 3: Application-Level Retry (Pragmatic)
- Keep current function
- Add retry logic in API route when duplicate key error occurs
- Regenerate PO number on retry

## Comparison with Adjustment Number Logic

The adjustment number uses a **different approach**:
- Format: `ADJ-YYYYMMDD-001` (date-based, not year-based)
- Counts records for the **current day** instead of finding MAX
- **Pros**: Simpler logic, less prone to extraction errors
- **Cons**: More granular (resets daily), potential race condition remains

## Current Status

✅ **Logic is mostly correct** for normal use cases
❌ **Needs error handling** for edge cases
❌ **Needs race condition protection** for concurrent requests

