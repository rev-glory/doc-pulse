import React from 'react';

export interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...', rows = 3 }) => {
  return (
    <div className="flex flex-col gap-4 p-8 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse my-4">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{message}</span>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        ))}
      </div>
    </div>
  );
};
