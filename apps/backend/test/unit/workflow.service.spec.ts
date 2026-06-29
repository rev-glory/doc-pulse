import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

import { WorkflowService } from "../../src/modules/workflow/services/workflow.service";
import { WorkflowState } from "../../src/domain/workflow";

describe("WorkflowService Orchestration Facade", () => {
  let workflowService: WorkflowService;
  let mockExecutorService: { start: any; resume: any; restart: any };

  beforeEach(() => {
    mockExecutorService = {
      start: mock.fn(),
      resume: mock.fn(),
      restart: mock.fn(),
    };

    workflowService = new WorkflowService(mockExecutorService as any);
  });

  it("should delegate workflow execution directly to WorkflowExecutorService.start()", async () => {
    const mockRepo = { name: "test-repo", rootPath: "/tmp/test" } as any;
    const mockDocs = { documentationFiles: [] } as any;
    const mockGenDocs = [
      {
        id: "doc-1",
        title: "README",
        path: "README.md",
        content: "hello",
        markdown: "hello",
        summary: "hello",
        type: "README" as any,
      },
    ];
    const mockReview = {
      score: 100,
      passed: true,
      issues: [],
      suggestions: [],
      approvedCount: 1,
      failedCount: 0,
      totalDocuments: 1,
    };

    const expectedFinalState: WorkflowState = {
      repository: mockRepo,
      documentation: mockDocs,
      generatedDocuments: mockGenDocs,
      criticReview: mockReview,
    };

    mockExecutorService.start.mock.mockImplementation(async (input: any) => {
      assert.equal(input.repositoryId, "test-repo");
      assert.equal(input.workspacePath, "/tmp/test");
      return expectedFinalState;
    });

    const input = {
      runId: "run-1",
      repositoryId: "test-repo",
      workspacePath: "/tmp/test",
      metadata: {},
    };

    const finalState = await workflowService.run(input);

    assert.equal(finalState, expectedFinalState);
    assert.equal(mockExecutorService.start.mock.calls.length, 1);
  });
});
