
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage(): React.JSX.Element {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    login();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: 'var(--accent)',
              animation: 'spin-slow 0.8s linear infinite',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Authenticating…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="login-page"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Ambient glow orbs ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'orb-float 8s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'orb-float 10s ease-in-out infinite reverse',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '-5%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'orb-float 12s ease-in-out infinite 2s',
        }}
      />

      {/* ── Grid pattern overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      {/* ── Login Card ── */}
      <div
        id="login-card"
        className="animate-slide-up relative z-10 w-full mx-4"
        style={{ maxWidth: '420px' }}
      >
        {/* Glowing border wrapper */}
        <div
          style={{
            position: 'absolute',
            inset: '-1px',
            borderRadius: 'calc(var(--radius-xl) + 1px)',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, transparent 50%, rgba(129,140,248,0.2) 100%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div
          className="glass relative"
          style={{
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: 'var(--shadow-accent)',
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-1px',
              }}
            >
              D
            </div>
            <h1
              className="text-gradient"
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                marginBottom: '0.35rem',
              }}
            >
              DocPulse
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
              AI-powered documentation automation
            </p>
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--border-hover), transparent)',
              marginBottom: '1.75rem',
            }}
          />

          {/* Error banner */}
          {errorParam && (
            <div
              className="animate-fade-in"
              style={{
                marginBottom: '1.25rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-dim)',
                border: '1px solid rgba(244,63,94,0.3)',
              }}
            >
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 500 }}>
                ⚠ Authentication failed. Please try again.
              </p>
            </div>
          )}

          {/* GitHub button */}
          <button
            id="github-login-btn"
            onClick={handleLogin}
            disabled={isLoggingIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.8rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: isLoggingIn ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
              border: '1px solid var(--border-hover)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              opacity: isLoggingIn ? 0.6 : 1,
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              if (!isLoggingIn) {
                const t = e.currentTarget;
                t.style.borderColor = 'var(--accent)';
                t.style.background = 'var(--bg-hover)';
                t.style.boxShadow = 'var(--shadow-accent)';
              }
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget;
              t.style.borderColor = 'var(--border-hover)';
              t.style.background = 'var(--bg-elevated)';
              t.style.boxShadow = 'none';
            }}
          >
            {isLoggingIn ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid var(--border-hover)',
                    borderTopColor: 'var(--accent-light)',
                    animation: 'spin-slow 0.7s linear infinite',
                    flexShrink: 0,
                  }}
                />
                <span>Connecting to GitHub…</span>
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Continue with GitHub
              </>
            )}
          </button>

          {/* Footer text */}
          <p
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              lineHeight: 1.6,
            }}
          >
            By continuing, you agree to our{' '}
            <span style={{ color: 'var(--text-secondary)' }}>Terms of Service</span>{' '}
            and{' '}
            <span style={{ color: 'var(--text-secondary)' }}>Privacy Policy</span>
          </p>
        </div>
      </div>

      {/* Bottom brand tag */}
      <div
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        DocPulse AI · v1.0 · Powered by LangGraph
      </div>
    </div>
  );
}
