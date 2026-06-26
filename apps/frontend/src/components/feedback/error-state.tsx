import React from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title = 'Something went wrong', message, retry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/30 text-center my-6">
      <h3 className="text-base font-semibold text-red-800 dark:text-red-300">{title}</h3>
      <p className="text-sm text-red-600 dark:text-red-400 mt-1 max-w-md">{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
