import { Intend, IntendItem } from '@/types';

export interface IntendWithPOStatus {
  id: string;
  vendor_id: string | null;
  status: Intend['status'];
  po_status?: 'none' | 'partial' | 'full';
  can_edit?: boolean;
  items?: (IntendItem & { po_info?: { po_id?: string; po_number?: string; po_status?: string } | null })[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates if an intend can be edited
 * @param intend - The intend with PO status information
 * @returns Validation result with error message if not editable
 */
export function validateIntendEditable(
  intend: IntendWithPOStatus
): ValidationResult {
  if (intend.po_status === 'full') {
    return {
      valid: false,
      error: 'Cannot modify intend - all items have been converted to purchase orders',
    };
  }

  return { valid: true };
}

/**
 * Validates if an intend item can be deleted
 * @param item - The intend item to check
 * @returns Validation result with error message including PO number if linked
 * Note: po_item_id is a flag (truthy if item exists in po_items.intend_item_id, falsy otherwise)
 */
export function validateItemDeletable(
  item: IntendItem & { po_info?: { po_number: string } | null }
): ValidationResult {
  // Check if item is in PO (po_item_id is truthy flag, not actual po_item.id)
  if (item.po_item_id !== null && item.po_item_id !== undefined) {
    const poNumber = item.po_info?.po_number || 'PO';
    return {
      valid: false,
      error: `Cannot delete item - it is already part of purchase order ${poNumber}`,
    };
  }

  return { valid: true };
}

/**
 * Validates if items can be converted to a purchase order
 * @param intend - The intend with PO status information
 * @param itemIds - Array of item IDs to convert
 * @returns Validation result with detailed error message
 */
export function validatePOConversion(
  intend: IntendWithPOStatus,
  itemIds: string[]
): ValidationResult {
  // Check if vendor exists
  if (!intend.vendor_id || intend.vendor_id.trim() === '') {
    return {
      valid: false,
      error: 'Vendor is required to create a purchase order. Please assign a vendor to this intend first.',
    };
  }

  // Check intend status - allow conversion for any status
  // Note: IntendStatus is 'pending' | 'partially_fulfilled' | 'fulfilled'
  // All statuses are allowed for PO conversion

  // Check if all items are already converted
  if (intend.po_status === 'full') {
    return {
      valid: false,
      error: 'Cannot create PO - all items have already been converted to purchase orders',
    };
  }

  // Check at least 1 item selected
  if (!itemIds || itemIds.length === 0) {
    return {
      valid: false,
      error: 'Please select at least one item to convert to purchase order',
    };
  }

  // Check selected items are not already in PO
  if (intend.items) {
    const invalidItems: string[] = [];
    const invalidItemPOs: string[] = [];

    for (const itemId of itemIds) {
      const item = intend.items.find((i) => i.id === itemId);
      // Check if item is in PO (po_item_id is truthy flag, checked via po_items.intend_item_id)
      if (item && item.po_item_id !== null && item.po_item_id !== undefined) {
        invalidItems.push(itemId);
        if (item.po_info?.po_number) {
          invalidItemPOs.push(item.po_info.po_number);
        }
      }
    }

    if (invalidItems.length > 0) {
      const poNumbers = [...new Set(invalidItemPOs)].join(', ');
      const poInfo = poNumbers ? ` (PO${invalidItemPOs.length > 1 ? 's' : ''}: ${poNumbers})` : '';
      return {
        valid: false,
        error: `Some selected items are already part of a purchase order${poInfo}. Please deselect them.`,
      };
    }
  }

  return { valid: true };
}

