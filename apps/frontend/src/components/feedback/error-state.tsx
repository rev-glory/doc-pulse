import React from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  retry,
}) => {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--danger-dim)',
        border: '1px solid rgba(244,63,94,0.2)',
        textAlign: 'center',
        margin: '0.5rem 0',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(244,63,94,0.15)',
          border: '1px solid rgba(244,63,94,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          flexShrink: 0,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--danger)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.6 }}>
        {message}
      </p>

      {retry && (
        <button
          type="button"
          onClick={retry}
          style={{
            marginTop: '1.25rem',
            padding: '0.5rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
};
