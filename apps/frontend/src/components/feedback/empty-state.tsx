import React from "react";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 2rem",
        borderRadius: "var(--radius-lg)",
        border: "1px dashed var(--border-hover)",
        background: "rgba(255,255,255,0.015)",
        textAlign: "center",
        margin: "0.5rem 0",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "var(--radius-md)",
          background: "var(--accent-dim)",
          border: "1px solid var(--border-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.25rem",
          flexShrink: 0,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-light)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
          <polyline points="13 2 13 9 20 9" />
          <line x1="12" y1="13" x2="12" y2="17" />
          <line x1="10" y1="15" x2="14" y2="15" />
        </svg>
      </div>

      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          marginBottom: "0.4rem",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          maxWidth: "360px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
      {action && <div style={{ marginTop: "1.5rem" }}>{action}</div>}
    </div>
  );
};
