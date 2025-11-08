/**
 * Format a number to 0 decimal places (whole numbers only)
 * @param value - The number to format
 * @returns Formatted string with 0 decimal places
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Math.round(Number(value)).toString();
}

/**
 * Format a number to 0 decimal places (whole numbers only)
 * @param value - The number to format
 * @returns Formatted string
 */
export function formatNumberCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Math.round(Number(value)).toString();
}

