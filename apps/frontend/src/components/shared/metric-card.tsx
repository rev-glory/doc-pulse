import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  status?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

const statusConfig = {
  default: { color: 'var(--text-primary)',   glow: 'transparent',      bg: 'transparent' },
  success: { color: 'var(--success)',         glow: 'rgba(16,185,129,0.2)',  bg: 'var(--success-dim)' },
  warning: { color: 'var(--warning)',         glow: 'rgba(245,158,11,0.2)', bg: 'var(--warning-dim)' },
  danger:  { color: 'var(--danger)',          glow: 'rgba(244,63,94,0.2)',  bg: 'var(--danger-dim)' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  status = 'default',
}) => {
  const cfg = statusConfig[status];

  return (
    <div
      className="animate-slide-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.75rem',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget;
        t.style.borderColor = 'var(--border-hover)';
        t.style.transform = 'translateY(-2px)';
        t.style.boxShadow = `var(--shadow-md), 0 0 20px ${cfg.glow}`;
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget;
        t.style.borderColor = 'var(--border)';
        t.style.transform = 'translateY(0)';
        t.style.boxShadow = 'none';
      }}
    >
      {/* Status accent top bar */}
      {status !== 'default' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: cfg.color,
            opacity: 0.6,
          }}
        />
      )}

      {/* Title */}
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}
      >
        {title}
      </span>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: cfg.color,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: 'var(--success-dim)',
              color: 'var(--success)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            ↑ {trend}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
