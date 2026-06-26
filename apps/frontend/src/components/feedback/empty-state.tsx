import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-center my-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 max-w-md">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
