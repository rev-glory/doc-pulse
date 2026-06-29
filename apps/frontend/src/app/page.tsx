"use client";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootIndexPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
      <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
    </div>
  );
}
