import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className = '',
  align = 'left',
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <th
      className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none ${alignClass} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <span>{label}</span>
        {isActive && sortDirection === 'asc' && (
          <ArrowUp className="w-3 h-3 text-gray-700" />
        )}
        {isActive && sortDirection === 'desc' && (
          <ArrowDown className="w-3 h-3 text-gray-700" />
        )}
        {!isActive && (
          <div className="w-3 h-3 opacity-30">
            <ArrowUp className="w-3 h-3" />
          </div>
        )}
      </div>
    </th>
  );
}



