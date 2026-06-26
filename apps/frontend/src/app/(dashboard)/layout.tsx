import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function AppDashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <DashboardLayout>{children}</DashboardLayout>;
}
