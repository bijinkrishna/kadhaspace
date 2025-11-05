import React from 'react';

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  bgColor?: string;
  onClick?: () => void;
}

export default function StatusCard({ 
  icon, 
  title, 
  value, 
  subtitle,
  bgColor = 'bg-blue-50',
  onClick 
}: StatusCardProps) {
  return (
    <div
      onClick={onClick}
      className={`${bgColor} rounded-lg shadow-sm border border-gray-200 p-5 transition-all cursor-pointer ${
        onClick ? 'hover:shadow-md hover:scale-105' : ''
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <div className="text-sm font-medium text-gray-700">{title}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-600">{subtitle}</div>
    </div>
  );
}

