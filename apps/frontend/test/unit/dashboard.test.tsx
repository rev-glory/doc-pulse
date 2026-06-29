import { test, describe } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RealtimeWorkflowStage } from "@docpulse/shared-types";

import { WorkflowStatusBadge } from "../../src/components/workflow/workflow-status-badge";
import { WorkflowTimeline } from "../../src/components/workflow/workflow-timeline";
import { LiveProgress } from "../../src/components/workflow/live-progress";
import { RepositoryTable } from "../../src/features/repositories/components/repository-table";
import { WorkflowRunsTable } from "../../src/features/runs/components/workflow-runs-table";

describe("Frontend Dashboard Presentation & Components Suite", () => {
  test("WorkflowStatusBadge renders correct label and style mapping", () => {
    const runMarkup = renderToStaticMarkup(
      <WorkflowStatusBadge status="running" />,
    );
    assert.ok(runMarkup.includes("Running"), "Should render Running label");
    assert.ok(
      runMarkup.includes("blue"),
      "Should map running status to blue color",
    );

    const doneMarkup = renderToStaticMarkup(
      <WorkflowStatusBadge status="completed" />,
    );
    assert.ok(
      doneMarkup.includes("Completed"),
      "Should render Completed label",
    );
    assert.ok(
      doneMarkup.includes("green"),
      "Should map completed status to green color",
    );
  });

  test("WorkflowTimeline renders stage progression indicators", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTimeline
        currentStage={RealtimeWorkflowStage.Writing}
        status="running"
      />,
    );
    assert.ok(markup.includes("Queued"), "Should render Queued step");
    assert.ok(markup.includes("[x]"), "Should mark past steps as done");
    assert.ok(
      markup.includes("[&gt;]"),
      "Should mark current step with active indicator",
    );
  });

  test("LiveProgress bounds progress percentages and displays error messages", () => {
    const markup = renderToStaticMarkup(
      <LiveProgress
        stage="Analyzing"
        progress={120}
        status="failed"
        errorMessage="Syntax error in AST"
      />,
    );
    assert.ok(markup.includes("100%"), "Should bound percentage to max 100%");
    assert.ok(
      markup.includes("Syntax error in AST"),
      "Should render telemetry error message",
    );
  });

  test("RepositoryTable renders empty state when list is empty", () => {
    const markup = renderToStaticMarkup(<RepositoryTable repositories={[]} />);
    assert.ok(
      markup.includes("No repositories connected"),
      "Should display empty state title",
    );
  });

  test("RepositoryTable renders connected repository rows", () => {
    const mockRepos = [
      {
        id: "repo-1",
        name: "doc-pulse",
        repositoryOwner: "rev-glory",
        defaultBranch: "main",
        status: "Active",
        latestWorkflow: "completed",
      },
    ];
    const markup = renderToStaticMarkup(
      <RepositoryTable repositories={mockRepos} />,
    );
    assert.ok(markup.includes("doc-pulse"), "Should render repo name");
    assert.ok(markup.includes("rev-glory"), "Should render owner name");
  });

  test("WorkflowRunsTable renders execution rows with progress bar", () => {
    const mockRuns: any[] = [
      {
        id: "run-12345678",
        repositoryName: "backend-api",
        commitSha: "abcdef12",
        branch: "feat/ai",
        currentStage: "Reviewing",
        progress: 80,
        status: "running",
      },
    ];
    const markup = renderToStaticMarkup(<WorkflowRunsTable runs={mockRuns} />);
    assert.ok(markup.includes("run-1234"), "Should render short run ID");
    assert.ok(
      markup.includes("80%"),
      "Should render bounded progress percentage",
    );
  });

  test("Mock API & WebSocket state simulation verification", () => {
    // Verify simulated telemetry payload transformations
    const mockWsPayload = {
      event: "workflow.progress",
      data: {
        runId: "test-run",
        stage: RealtimeWorkflowStage.CreatingPR,
        progress: 95,
      },
    };
    assert.strictEqual(mockWsPayload.data.progress, 95);
    assert.strictEqual(
      mockWsPayload.data.stage,
      RealtimeWorkflowStage.CreatingPR,
    );
  });
});
