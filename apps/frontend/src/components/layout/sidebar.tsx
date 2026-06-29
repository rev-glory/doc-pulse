"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";

// ── SVG Icon components ─────────────────────────────────
const IconDashboard = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconRepositories = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h6l2 3h10v14H3z" />
    <path d="M9 3v18" />
  </svg>
);

const IconRuns = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

const IconPullRequests = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 012 2v7" />
    <path d="M6 9v12" />
  </svg>
);

const IconReviews = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconIntegrations = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);

const IconSettings = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const IconLogout = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// ── Nav items config ─────────────────────────────────────
const navItems = [
  { label: "Dashboard", href: "/dashboard", Icon: IconDashboard, exact: false },
  {
    label: "Repositories",
    href: "/repositories",
    Icon: IconRepositories,
    exact: false,
  },
  { label: "Workflow Runs", href: "/runs", Icon: IconRuns, exact: false },
  {
    label: "Pull Requests",
    href: "/pull-requests",
    Icon: IconPullRequests,
    exact: false,
  },
  { label: "Human Reviews", href: "/reviews", Icon: IconReviews, exact: false },
  {
    label: "Integrations",
    href: "/settings/integrations",
    Icon: IconIntegrations,
    exact: false,
  },
  { label: "Settings", href: "/settings", Icon: IconSettings, exact: true },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname() || "/";
  const { logout } = useAuth();

  return (
    <aside
      aria-label="Main Navigation"
      style={{
        width: "240px",
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          height: "60px",
          padding: "0 1.25rem",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background:
                "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 0 12px rgba(99,102,241,0.4)",
              flexShrink: 0,
            }}
          >
            D
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            DocPulse
          </span>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: "0.75rem 0.75rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {/* Section label */}
        <div
          style={{
            padding: "0.25rem 0.5rem 0.5rem",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Navigation
        </div>

        {navItems.map((item, i) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) ||
              (pathname === "/" && item.href === "/dashboard");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`animate-slide-right animate-stagger-${Math.min(i + 1, 4)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.845rem",
                fontWeight: isActive ? 600 : 500,
                textDecoration: "none",
                transition: "all 0.18s ease",
                ...(isActive
                  ? {
                      background: "var(--accent-dim)",
                      color: "var(--accent-light)",
                      border: "1px solid var(--border-accent)",
                      boxShadow: "0 0 12px rgba(99,102,241,0.12)",
                    }
                  : {
                      color: "var(--text-secondary)",
                      background: "transparent",
                      border: "1px solid transparent",
                    }),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>
                <item.Icon />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "0.75rem",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => logout()}
          type="button"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            padding: "0.55rem 0.75rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.845rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
            background: "transparent",
            border: "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--danger-dim)";
            e.currentTarget.style.color = "var(--danger)";
            e.currentTarget.style.borderColor = "rgba(244,63,94,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <span style={{ opacity: 0.65, flexShrink: 0 }}>
            <IconLogout />
          </span>
          <span>Logout</span>
        </button>

        <div
          style={{
            marginTop: "0.75rem",
            padding: "0 0.75rem",
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          DocPulse AI · v1.0
        </div>
      </div>
    </aside>
  );
};
