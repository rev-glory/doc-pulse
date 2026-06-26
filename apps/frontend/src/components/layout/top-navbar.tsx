'use client';

import React from 'react';
import { Breadcrumb } from './breadcrumb';

export interface TopNavbarProps {
  wsConnected?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ wsConnected = true }) => {
  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-zinc-600 dark:text-zinc-400">Realtime {wsConnected ? 'Connected' : 'Offline'}</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
          YC
        </div>
      </div>
    </header>
  );
};
