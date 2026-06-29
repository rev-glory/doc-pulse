'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Breadcrumb: React.FC = () => {
  const pathname = usePathname() || '/';
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) {
    return (
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        Dashboard
      </span>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.825rem',
        color: 'var(--text-secondary)',
      }}
    >
      <Link
        href="/dashboard"
        style={{
          color: 'var(--text-muted)',
          textDecoration: 'none',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        Dashboard
      </Link>
      {parts.map((part, index) => {
        const href = `/${parts.slice(0, index + 1).join('/')}`;
        const isLast = index === parts.length - 1;
        const formatted = part.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <React.Fragment key={href}>
            <span style={{ color: 'var(--border-hover)', fontSize: '0.75rem' }}>›</span>
            {isLast ? (
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatted}</span>
            ) : (
              <Link
                href={href}
                style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
