'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { TopNavbar } from './top-navbar';
import { useWorkflowSocket } from '../../hooks/use-workflow-socket';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  // Connect global workflow socket listener for auto-refresh
  const { isConnected } = useWorkflowSocket({
    runId: 'global-dashboard-feed',
    workflowId: 'global-dashboard-feed',
    autoConnect: true,
  });

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar wsConnected={isConnected} />
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
