import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  status?: 'default' | 'success' | 'warning' | 'danger';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  status = 'default',
}) => {
  const statusColors = {
    default: 'text-zinc-900 dark:text-zinc-100',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-extrabold tracking-tight ${statusColors[status]}`}>{value}</span>
        {trend && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</span>}
      </div>
      {subtitle && <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block">{subtitle}</span>}
    </div>
  );
};
