import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function useSortable<T>(data: T[], defaultSort?: SortConfig<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    defaultSort || null
  );

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.key) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle nested properties (e.g., 'vendor.name')
      const keyStr = String(sortConfig.key);
      if (keyStr.includes('.')) {
        const keys = keyStr.split('.');
        aValue = keys.reduce((obj: any, key) => obj?.[key], a);
        bValue = keys.reduce((obj: any, key) => obj?.[key], b);
      } else {
        aValue = (a as any)[sortConfig.key];
        bValue = (b as any)[sortConfig.key];
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Convert to comparable values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Handle dates
      if (aValue instanceof Date || typeof aValue === 'string' && !isNaN(Date.parse(aValue))) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Compare values
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  const handleSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null; // Reset to no sorting
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  const getSortDirection = (key: keyof T | string): SortDirection => {
    if (sortConfig && sortConfig.key === key) {
      return sortConfig.direction;
    }
    return null;
  };

  return {
    sortedData,
    handleSort,
    getSortDirection,
    sortConfig,
  };
}


