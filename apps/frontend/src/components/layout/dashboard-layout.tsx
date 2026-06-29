"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";
import { useWorkflowSocket } from "../../hooks/use-workflow-socket";

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const { isConnected } = useWorkflowSocket({
    runId: "global-dashboard-feed",
    workflowId: "global-dashboard-feed",
    autoConnect: true,
  });

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        overflow: "hidden",
        fontFamily: "var(--font-geist-sans, Inter, system-ui, sans-serif)",
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <TopNavbar wsConnected={isConnected} />
        <main
          className="animate-fade-in"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "2rem 2.5rem",
            maxWidth: "1400px",
            width: "100%",
            alignSelf: "center",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
