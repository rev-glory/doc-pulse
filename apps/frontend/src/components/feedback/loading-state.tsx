import React from 'react';

export interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...', rows = 3 }) => {
  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        margin: '0.5rem 0',
      }}
    >
      {/* Message row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: '2px solid var(--border-hover)',
            borderTopColor: 'var(--accent)',
            flexShrink: 0,
            animation: 'spin-slow 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {message}
        </span>
      </div>

      {/* Shimmer rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="shimmer"
            style={{
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              width: i === rows - 1 ? '70%' : '100%',
              opacity: 1 - i * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
};
