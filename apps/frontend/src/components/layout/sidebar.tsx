'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/auth-provider';

export const Sidebar: React.FC = () => {
  const pathname = usePathname() || '/';
  const { logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '⚡' },
    { label: 'Repositories', href: '/repositories', icon: '📁' },
    { label: 'Workflow Runs', href: '/runs', icon: '🚀' },
    { label: 'Pull Requests', href: '/pull-requests', icon: '🔀' },
    { label: 'Human Reviews', href: '/reviews', icon: '📝' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <aside aria-label="Main Navigation" className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-full shrink-0">
      <div className="h-16 px-6 flex items-center border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
          <span className="w-7 h-7 bg-emerald-600 text-white rounded flex items-center justify-center text-sm font-black">D</span>
          <span>DocPulse</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) || (pathname === '/' && item.href === '/dashboard');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2.5">
        <button
          onClick={() => logout()}
          type="button"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-700 transition-colors w-full text-left cursor-pointer"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
        <div className="text-[10px] text-zinc-400 pl-3">
          DocPulse AI v1.0
        </div>
      </div>
    </aside>
  );
};
