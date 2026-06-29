import React from "react";

export interface WorkflowStatusBadgeProps {
  status: string;
}

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
  status,
}) => {
  const normalized = status?.toLowerCase() || "pending";

  let label = "Pending";
  let color = "gray";

  switch (normalized) {
    case "running":
    case "active":
      label = "Running";
      color = "blue";
      break;
    case "completed":
    case "finished":
      label = "Completed";
      color = "green";
      break;
    case "failed":
      label = "Failed";
      color = "red";
      break;
    case "cancelled":
      label = "Cancelled";
      color = "yellow";
      break;
    case "waiting_for_review":
      label = "Review Pending";
      color = "#8b5cf6";
      break;
    case "skipped":
      label = "Skipped";
      color = "#f97316";
      break;
    default:
      label = "Pending";
      color = "gray";
      break;
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        border: `1px solid ${color}`,
        borderRadius: "4px",
        color: color,
        fontWeight: "bold",
        fontSize: "12px",
      }}
    >
      {label}
    </span>
  );
};
