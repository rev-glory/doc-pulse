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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <header
      style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        background: 'rgba(8,8,15,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {/* Left: Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Breadcrumb />
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Realtime status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: wsConnected ? 'rgba(16,185,129,0.1)' : 'var(--danger-dim)',
            border: `1px solid ${wsConnected ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: wsConnected ? 'var(--success)' : 'var(--danger)',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: wsConnected ? 'var(--success)' : 'var(--danger)',
              flexShrink: 0,
              animation: wsConnected ? 'pulseDot 1.8s ease-in-out infinite' : 'none',
            }}
          />
          Realtime {wsConnected ? 'Connected' : 'Offline'}
        </div>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '20px',
            background: 'var(--border-hover)',
          }}
        />

        {/* User menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            id="user-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            onMouseLeave={(e) => {
              if (!menuOpen) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }
            }}
          >
            {/* Avatar */}
            {user?.githubAvatarUrl ? (
              <img
                src={user.githubAvatarUrl}
                alt={user.displayName || user.githubLogin}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px solid var(--border-accent)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {user?.githubLogin?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
            )}

            {/* Name */}
            <div style={{ textAlign: 'left' }} className="hidden sm:block">
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {user?.displayName || user?.githubLogin}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                @{user?.githubLogin}
              </div>
            </div>

            {/* Chevron */}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                color: 'var(--text-muted)',
                transition: 'transform 0.2s ease',
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                marginTop: '0.5rem',
                width: '220px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-hover)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              {/* User info */}
              <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.displayName || user?.githubLogin}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  @{user?.githubLogin}
                </p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: 'var(--danger)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
