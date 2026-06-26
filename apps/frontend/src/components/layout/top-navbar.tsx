'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Breadcrumb } from './breadcrumb';
import { useAuth } from '@/features/auth/providers/auth-provider';

export interface TopNavbarProps {
  wsConnected?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ wsConnected = true }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

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

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all"
          >
            {user?.githubAvatarUrl ? (
              <img
                src={user.githubAvatarUrl}
                alt={user.displayName || user.githubLogin}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {user?.githubLogin.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.displayName || user?.githubLogin}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">@{user?.githubLogin}</div>
            </div>
            <svg
              className="w-4 h-4 text-zinc-500 dark:text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 py-2 z-50">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {user?.displayName || user?.githubLogin}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">@{user?.githubLogin}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
