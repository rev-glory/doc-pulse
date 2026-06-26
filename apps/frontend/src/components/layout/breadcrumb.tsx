'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Breadcrumb: React.FC = () => {
  const pathname = usePathname() || '/';
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) {
    return <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</span>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-zinc-500">
      <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        Dashboard
      </Link>
      {parts.map((part, index) => {
        const href = `/${parts.slice(0, index + 1).join('/')}`;
        const isLast = index === parts.length - 1;
        const formatted = part.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <React.Fragment key={href}>
            <span className="text-zinc-400">/</span>
            {isLast ? (
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatted}</span>
            ) : (
              <Link href={href} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
