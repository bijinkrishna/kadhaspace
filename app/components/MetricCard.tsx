import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ReactNode;
  color?: 'green' | 'orange' | 'blue' | 'purple' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export default function MetricCard({ 
  label, 
  value, 
  helper, 
  icon, 
  color = 'green',
  size = 'md'
}: MetricCardProps) {
  const borderClasses = {
    green: 'border-l-green-500',
    orange: 'border-l-orange-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    red: 'border-l-red-500',
  };

  const textClasses = {
    green: 'text-green-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
  };

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5 border-l-4 ${borderClasses[color]}`}>
      <div className={`text-sm font-medium mb-2 flex items-center gap-2 ${textClasses[color]}`}>
        {icon}
        {label}
      </div>
      <div className={`font-bold ${textClasses[color]} ${sizeClasses[size]}`}>
        {value}
      </div>
      {helper && (
        <div className="text-xs text-gray-500 mt-2">
          {helper}
        </div>
      )}
    </div>
  );
}

