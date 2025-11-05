'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  viewAllLink?: string;
  viewAllLabel?: string;
}

export default function SectionHeader({ 
  title, 
  icon, 
  viewAllLink,
  viewAllLabel = 'View All'
}: SectionHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {viewAllLink && (
        <button
          onClick={() => router.push(viewAllLink)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
        >
          {viewAllLabel}
          <span>→</span>
        </button>
      )}
    </div>
  );
}

