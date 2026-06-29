import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { GitHubWebhookService } from "../../src/modules/github/services/github-webhook.service";

describe("GitHubWebhookService - Default Branch Strategy", () => {
  let service: GitHubWebhookService;
  let mockConfigService: any;
  let mockPrisma: any;
  let mockWebhookEventsService: any;
  let mockGitHubInstallationService: any;
  let mockRepositoriesService: any;
  let mockWorkflowQueueService: any;
  let mockWorkspaceService: any;

  const deliveryId = "test-delivery-id";

  beforeEach(() => {
    mockConfigService = {
      get: mock.fn((key: string) => {
        if (key === "github") return { webhookSecret: "test-secret" };
        return null;
      }),
    };

    mockPrisma = {
      repository: {
        findUnique: mock.fn(),
        update: mock.fn(),
      },
      workflowRun: {
        create: mock.fn(async (args: any) => ({
          id: "run-uuid",
          ...args.data,
        })),
      },
    };

    mockWebhookEventsService = {
      createEvent: mock.fn(async () => {}),
      markAsProcessed: mock.fn(async () => {}),
      markAsFailed: mock.fn(async () => {}),
    };

    mockGitHubInstallationService = {};
    mockRepositoriesService = {};

    mockWorkflowQueueService = {
      enqueueWorkflow: mock.fn(async () => ({ id: "job-uuid" })),
    };

    mockWorkspaceService = {
      getRepositoryPath: mock.fn(() => "/fake/repo/path"),
    };

    service = new GitHubWebhookService(
      mockConfigService,
      mockPrisma,
      mockWebhookEventsService,
      mockGitHubInstallationService,
      mockRepositoriesService,
      mockWorkflowQueueService,
      mockWorkspaceService,
    );
  });

  it("should proceed and enqueue workflow when pushing to the default branch (main)", async () => {
    const payload = {
      ref: "refs/heads/main",
      after: "sha-123",
      head_commit: { message: "Commit message" },
      repository: { id: 12345, name: "my-repo", default_branch: "main" },
    };

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: "main",
    }));

    await service.handleEvent("push", deliveryId, payload);

    assert.equal(mockPrisma.workflowRun.create.mock.calls.length, 1);
    assert.equal(mockWorkflowQueueService.enqueueWorkflow.mock.calls.length, 1);
    assert.equal(mockWebhookEventsService.markAsProcessed.mock.calls.length, 1);
    assert.equal(mockPrisma.repository.update.mock.calls.length, 0);
  });

  it("should proceed and enqueue workflow when pushing to the default branch (master)", async () => {
    const payload = {
      ref: "refs/heads/master",
      after: "sha-123",
      head_commit: { message: "Commit message" },
      repository: { id: 12345, name: "my-repo", default_branch: "master" },
    };

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: "master",
    }));

    await service.handleEvent("push", deliveryId, payload);

    assert.equal(mockPrisma.workflowRun.create.mock.calls.length, 1);
    assert.equal(mockWorkflowQueueService.enqueueWorkflow.mock.calls.length, 1);
    assert.equal(mockWebhookEventsService.markAsProcessed.mock.calls.length, 1);
    assert.equal(mockPrisma.repository.update.mock.calls.length, 0);
  });

  it("should skip workflow, log details, and mark webhook as processed when pushing to non-default branch", async () => {
    const payload = {
      ref: "refs/heads/feature/login",
      after: "sha-123",
      head_commit: { message: "Commit message" },
      repository: { id: 12345, name: "my-repo", default_branch: "main" },
    };

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: "main",
    }));

    await service.handleEvent("push", deliveryId, payload);

    // No workflow runs or jobs should be created/enqueued
    assert.equal(mockPrisma.workflowRun.create.mock.calls.length, 0);
    assert.equal(mockWorkflowQueueService.enqueueWorkflow.mock.calls.length, 0);
    // Webhook should be marked processed successfully
    assert.equal(mockWebhookEventsService.markAsProcessed.mock.calls.length, 1);
    assert.equal(mockPrisma.repository.update.mock.calls.length, 0);
  });

  it("should update defaultBranch in DB if the webhook payload default_branch is different", async () => {
    const payload = {
      ref: "refs/heads/master",
      after: "sha-123",
      head_commit: { message: "Commit message" },
      repository: { id: 12345, name: "my-repo", default_branch: "master" },
    };

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: "main", // stored DB is stale
    }));

    await service.handleEvent("push", deliveryId, payload);

    // Should update default branch in DB
    assert.equal(mockPrisma.repository.update.mock.calls.length, 1);
    const updateCall = mockPrisma.repository.update.mock.calls[0].arguments[0];
    assert.equal(updateCall.where.id, "repo-uuid");
    assert.equal(updateCall.data.defaultBranch, "master");

    // Should also run workflow since pushed branch (master) matches updated default branch (master)
    assert.equal(mockPrisma.workflowRun.create.mock.calls.length, 1);
    assert.equal(mockWorkflowQueueService.enqueueWorkflow.mock.calls.length, 1);
    assert.equal(mockWebhookEventsService.markAsProcessed.mock.calls.length, 1);
  });

  it("first-webhook scenario: should use payload default_branch and update DB if DB defaultBranch is null/empty", async () => {
    const payload = {
      ref: "refs/heads/master",
      after: "sha-123",
      head_commit: { message: "Commit message" },
      repository: { id: 12345, name: "my-repo", default_branch: "master" },
    };

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: null, // not yet synchronized/persisted
    }));

    await service.handleEvent("push", deliveryId, payload);

    assert.equal(mockPrisma.repository.update.mock.calls.length, 1);
    const updateCall = mockPrisma.repository.update.mock.calls[0].arguments[0];
    assert.equal(updateCall.where.id, "repo-uuid");
    assert.equal(updateCall.data.defaultBranch, "master");

    assert.equal(mockPrisma.workflowRun.create.mock.calls.length, 1);
    assert.equal(mockWorkflowQueueService.enqueueWorkflow.mock.calls.length, 1);
    assert.equal(mockWebhookEventsService.markAsProcessed.mock.calls.length, 1);
  });

  it("should fail gracefully if the pushed branch cannot be determined", async () => {
    const payload = {
      after: "sha-123",
      repository: { id: 12345, name: "my-repo", default_branch: "main" },
    }; // no 'ref'

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: "main",
    }));

    await assert.rejects(
      () => service.handleEvent("push", deliveryId, payload),
      /Unable to determine pushed branch from webhook payload/,
    );

    assert.equal(mockWebhookEventsService.markAsFailed.mock.calls.length, 1);
  });

  it("should fail gracefully if the default branch cannot be determined", async () => {
    const payload = {
      ref: "refs/heads/main",
      after: "sha-123",
      repository: { id: 12345, name: "my-repo" }, // no default_branch
    };

    mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
      id: "repo-uuid",
      githubRepositoryId: 12345,
      defaultBranch: null, // DB also null
    }));

    await assert.rejects(
      () => service.handleEvent("push", deliveryId, payload),
      /Could not determine default branch for repository/,
    );

    assert.equal(mockWebhookEventsService.markAsFailed.mock.calls.length, 1);
  });
});
