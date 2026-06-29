import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '1.5rem',
        marginBottom: '2rem',
        borderBottom: '1px solid var(--border)',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1
          className="text-gradient-warm"
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              marginTop: '0.35rem',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
};
