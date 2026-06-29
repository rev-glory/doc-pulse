import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DisabledRepositoryRule,
  CommitMessageSkipRule,
  DocumentationOnlyRule,
  DependencyOnlyRule,
  EarlySkipNode,
} from "../../src/modules/workflow/nodes";
import { WorkflowNodeName, WorkflowStage } from "../../src/domain/workflow";
import { buildDocumentationWorkflowGraph } from "../../src/modules/workflow/graph/documentation-workflow.graph";
import { WorkflowNodeExecutionWrapper } from "../../src/modules/workflow/graph/workflow-node-execution.wrapper";
import { RunsService } from "../../src/modules/runs/services/runs.service";

describe("Early Skip Rules", () => {
  const mockState = {} as any;

  it("DisabledRepositoryRule should skip if repository is inactive", async () => {
    const rule = new DisabledRepositoryRule();
    const res = await rule.evaluate({
      isRepositoryActive: false,
      modifiedFiles: ["src/index.ts"],
      commitMessage: "feat: add login",
      state: mockState,
    });
    assert.ok(res.shouldSkip);
    assert.equal(res.reason, "Repository documentation generation disabled");
  });

  it("CommitMessageSkipRule should skip if message contains [skip ci]", async () => {
    const rule = new CommitMessageSkipRule();
    const res1 = await rule.evaluate({
      isRepositoryActive: true,
      modifiedFiles: ["src/index.ts"],
      commitMessage: "docs: fix spelling [skip ci]",
      state: mockState,
    });
    assert.ok(res1.shouldSkip);
    assert.equal(res1.reason, "Explicit skip request in commit message");

    const res2 = await rule.evaluate({
      isRepositoryActive: true,
      modifiedFiles: ["src/index.ts"],
      commitMessage: "feat: regular commit message",
      state: mockState,
    });
    assert.ok(!res2.shouldSkip);
  });

  it("DocumentationOnlyRule should skip if only md files are changed", async () => {
    const rule = new DocumentationOnlyRule();
    const res1 = await rule.evaluate({
      isRepositoryActive: true,
      modifiedFiles: ["README.md", "docs/api.md"],
      commitMessage: "docs: update readme",
      state: mockState,
    });
    assert.ok(res1.shouldSkip);
    assert.equal(res1.reason, "Documentation-only changes");

    const res2 = await rule.evaluate({
      isRepositoryActive: true,
      modifiedFiles: ["README.md", "src/main.ts"],
      commitMessage: "feat: code change",
      state: mockState,
    });
    assert.ok(!res2.shouldSkip);
  });

  it("DependencyOnlyRule should skip if only package-lock.json is modified", async () => {
    const rule = new DependencyOnlyRule();
    const res1 = await rule.evaluate({
      isRepositoryActive: true,
      modifiedFiles: ["package-lock.json"],
      commitMessage: "chore: package bump",
      state: mockState,
    });
    assert.ok(res1.shouldSkip);
    assert.equal(res1.reason, "Dependency-only updates");

    const res2 = await rule.evaluate({
      isRepositoryActive: true,
      modifiedFiles: ["package.json", "src/index.ts"],
      commitMessage: "feat: regular commit",
      state: mockState,
    });
    assert.ok(!res2.shouldSkip);
  });
});

describe("EarlySkipNode Invocation", () => {
  it("should run all rules and return skip decision details, and clone repo if missing", async () => {
    let cloneCalled = false;
    const mockPrisma = {
      repository: {
        findUnique: async () => ({
          id: "repo-1",
          isActive: true,
          cloneUrl: "https://github.com/test/repo",
          defaultBranch: "main",
        }),
      },
    } as any;

    const mockWorkspaceLifecycle = {
      workspaceExists: async () => false,
      getWorkspacePath: () => "/path/to/workspace",
    } as any;

    const mockRepoClone = {
      cloneRepository: async () => {
        cloneCalled = true;
      },
    } as any;

    const mockGit = {
      getModifiedFiles: async () => ["package-lock.json"],
      getCommitMessage: async () => "chore: lock file update",
    } as any;

    // Rules
    const rules = [new DependencyOnlyRule()];

    const node = new EarlySkipNode(
      mockPrisma,
      mockGit,
      mockRepoClone,
      mockWorkspaceLifecycle,
      rules,
    );

    const res = await node.invoke({
      repositoryId: "repo-1",
      commitSha: "abcdef",
    } as any);

    assert.ok(cloneCalled);
    assert.ok(res.shouldSkip);
    assert.equal(res.skipReason, "Dependency-only updates");
    assert.deepEqual(res.changedFiles, ["package-lock.json"]);
    assert.equal(res.commitMessage, "chore: lock file update");
    assert.equal(res.workspacePath, "/path/to/workspace");
  });
});

describe("Early Skip Graph Routing & Downstream Protection", () => {
  const executedNodes: string[] = [];

  const mockAdapters = {
    earlySkipStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.EarlySkip);
      return {
        currentNode: WorkflowNodeName.EarlySkip,
        shouldSkip: state.metadata?.testShouldSkip,
        skipReason: state.metadata?.testSkipReason,
      };
    },
    repositoryAnalyzerStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.RepositoryAnalyzer);
      return { currentNode: WorkflowNodeName.RepositoryAnalyzer };
    },
    documentationLocatorStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.DocumentationLocator);
      return { currentNode: WorkflowNodeName.DocumentationLocator };
    },
    codebaseAnalyzerStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.CodebaseAnalyzer);
      return { currentNode: WorkflowNodeName.CodebaseAnalyzer };
    },
    technicalWriterStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.TechnicalWriter);
      return { currentNode: WorkflowNodeName.TechnicalWriter };
    },
    documentationCriticStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.DocumentationCritic);
      return { currentNode: WorkflowNodeName.DocumentationCritic };
    },
    gitCommitStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.GitCommit);
      return { currentNode: WorkflowNodeName.GitCommit };
    },
    pushBranchStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.PushBranch);
      return { currentNode: WorkflowNodeName.PushBranch };
    },
    createPullRequestStep: async (state: any) => {
      executedNodes.push(WorkflowNodeName.CreatePullRequest);
      return { currentNode: WorkflowNodeName.CreatePullRequest };
    },
  } as any;

  const graph = buildDocumentationWorkflowGraph(mockAdapters, {
    minDocScore: 80,
  });

  it("should route to END if shouldSkip is true", async () => {
    executedNodes.length = 0;
    const finalState = await graph.invoke({
      runId: "run-skip",
      repositoryId: "repo-1",
      workspacePath: "/tmp",
      currentNode: WorkflowNodeName.EarlySkip,
      metadata: { testShouldSkip: true, testSkipReason: "Test skip" },
    } as any);

    assert.ok(executedNodes.includes(WorkflowNodeName.EarlySkip));
    assert.ok(!executedNodes.includes(WorkflowNodeName.RepositoryAnalyzer));
    assert.equal(finalState.currentNode, WorkflowNodeName.EarlySkip);
  });

  it("should route to RepositoryAnalyzer if shouldSkip is false", async () => {
    executedNodes.length = 0;
    const finalState = await graph.invoke({
      runId: "run-continue",
      repositoryId: "repo-1",
      workspacePath: "/tmp",
      currentNode: WorkflowNodeName.EarlySkip,
      metadata: { testShouldSkip: false },
    } as any);

    assert.ok(executedNodes.includes(WorkflowNodeName.EarlySkip));
    assert.ok(executedNodes.includes(WorkflowNodeName.RepositoryAnalyzer));
    assert.equal(finalState.currentNode, WorkflowNodeName.DocumentationCritic);
  });
});

describe("Early Skip API Mappings & Persistence", () => {
  it("WorkflowNodeExecutionWrapper should serialize skip parameters in snapshot", () => {
    const mockCheckpointRepo = {} as any;
    const mockPrisma = {} as any;

    const wrapper = new WorkflowNodeExecutionWrapper(
      mockCheckpointRepo,
      mockPrisma,
    );
    const mockState = {
      runId: "run-1",
      repositoryId: "repo-1",
      workspacePath: "/tmp",
      changedFiles: ["README.md"],
      commitMessage: "docs: update",
      shouldSkip: true,
      skipReason: "Documentation-only changes",
      metadata: { test: true },
    } as any;

    const snapshot = (wrapper as any).constructLightweightSnapshot(
      mockState,
      WorkflowNodeName.EarlySkip,
      [WorkflowNodeName.EarlySkip],
    );

    assert.equal(snapshot.shouldSkip, true);
    assert.equal(snapshot.skipReason, "Documentation-only changes");
    assert.deepEqual(snapshot.changedFiles, ["README.md"]);
    assert.equal(snapshot.commitMessage, "docs: update");
  });

  it("RunsService should map early skip columns correctly in response object", async () => {
    const mockPrisma = {
      workflowRun: {
        findUnique: async () => ({
          id: "run-1",
          correlationId: "c-1",
          commitSha: "sha-1",
          branch: "main",
          commitMessage: "commit-1",
          status: "COMPLETED",
          currentStage: "EARLY_SKIP",
          currentNode: "EarlySkip",
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          repositoryId: "repo-1",
          repository: {
            name: "repo-name",
            repositoryOwner: "owner",
            ownerId: "user-1",
          },
          errorMessage: null,
          pullRequestUrl: null,
          gitOperationStatus: null,
          skipReason: "Docs-only changes",
          completionReason: "SKIPPED",
          checkpointSnapshot: {
            completedNodes: ["EarlySkip"],
          },
        }),
      },
    } as any;

    const service = new RunsService(mockPrisma);
    const res = await service.getRunById("run-1", { id: "user-1" } as any);

    assert.equal(res.completionReason, "SKIPPED");
    assert.equal(res.skipReason, "Docs-only changes");
  });
});
