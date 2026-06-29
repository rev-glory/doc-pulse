"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AppDashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <></>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
