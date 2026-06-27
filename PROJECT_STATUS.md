# DocPulse — Project Status & Context

> **READ THIS FIRST.** This document is the source of truth for every new conversation.
> Do not redesign architecture. Do not introduce new lifecycle states. Follow existing implementation patterns.
> Last verified: 2026-06-27 — all fixes complete, 79/79 tests pass, 0 TypeScript errors.

---

## 1. Project Overview

DocPulse is a NestJS monorepo backend that uses **LangGraph** to orchestrate an AI-driven documentation generation pipeline triggered by GitHub push webhooks.

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, NestJS |
| Language | TypeScript (strict) |
| AI Orchestration | LangGraph (`@langchain/langgraph`) |
| AI Models | Google Gemini (via LLM service) |
| Queue | BullMQ + Redis |
| Database | PostgreSQL + Prisma ORM |
| WebSockets | Socket.IO (NestJS gateway) |
| GitHub | GitHub App (Octokit) |
| Package Manager | pnpm (workspace monorepo) |

### Monorepo Structure

```
code/
├── apps/
│   ├── backend/          ← NestJS API + LangGraph orchestration (MAIN APP)
│   │   ├── src/
│   │   │   ├── domain/           ← Pure domain types (no framework deps)
│   │   │   ├── modules/
│   │   │   │   ├── workflow/     ← LangGraph graph, nodes, persistence, executor
│   │   │   │   ├── queue/        ← BullMQ consumers/producers
│   │   │   │   ├── realtime/     ← Socket.IO gateway & event service
│   │   │   │   ├── ai/           ← LLM service, retry policy
│   │   │   │   ├── document-generation/ ← Technical writer service
│   │   │   │   ├── document-review/     ← Critic service
│   │   │   │   ├── git-operations/      ← Clone, commit, push
│   │   │   │   ├── github/              ← PR creation, webhooks
│   │   │   │   ├── repositories/        ← Repo management + sync
│   │   │   │   └── ...
│   │   │   └── generated/prisma/ ← Auto-generated Prisma client
│   │   ├── prisma/schema.prisma
│   │   └── test/unit/            ← Node.js native test runner specs
│   └── frontend/         ← (separate, not covered here)
└── packages/             ← Shared types (@docpulse/shared-types)
```

---

## 2. Workflow Architecture

### LangGraph Pipeline (8 nodes)

```
START
  └─→ RepositoryAnalyzer     (clone repo if needed + run analysis)
        └─→ DocumentationLocator  (find existing docs)
              └─→ TechnicalWriter     (AI: generate docs)
                    └─→ DocumentationCritic  (AI: score & review)
                          ├─→ [critic passes] → HumanReview
                          │                        ├─→ [APPROVED] → GitCommit
                          │                        │                  └─→ PushBranch
                          │                        │                        └─→ CreatePullRequest → END
                          │                        ├─→ [PENDING]   → END   (suspended, awaiting human)
                          │                        └─→ [REJECTED]  → END   (failed)
                          └─→ [critic fails]  → END  (failed)
```

### The Four Graph Termination Points

The graph always terminates at `END` in exactly four situations.
`WorkflowExecutorService` is responsible for translating each into the correct persisted state:

| Condition in `finalState` | `WorkflowRun.status` persisted | `executionStatus` returned |
|---|---|---|
| `criticReview.passed === false` | `FAILED` | `ReviewFailed` |
| `humanReviewStatus === 'PENDING'` | `CHECKPOINTED` | `NeedsReview` |
| `humanReviewStatus === 'REJECTED'` | `FAILED` | `ReviewFailed` |
| PR created (happy path) | `COMPLETED` | `Completed` |

**Do NOT add a fifth termination path or redesign this routing.**

---

## 3. Canonical Lifecycle State — WorkflowRun.status

`WorkflowRun.status` (PostgreSQL `RunStatus` enum) is the **single source of truth** for workflow state.

```
QUEUED → RUNNING → CHECKPOINTED   (awaiting human review, resumable)
                 → COMPLETED      (PR created)
                 → FAILED         (critic reject / human reject / exception)
                 → CANCELLED      (manual)
```

All user-facing APIs (dashboard, runs, review) consume `WorkflowRun.status` from the database.

### Database Models (Prisma)

- **WorkflowRun** — one per pipeline execution. Includes checkpoint snapshot, optimistic lock version, node retries.
- **Review** — one per WorkflowRun. Status: `PENDING | APPROVED | REJECTED | CHANGES_REQUESTED`.
- **PullRequest** — created by `CreatePullRequestNode`. One per WorkflowRun.
- **Repository**, **Installation**, **User** — GitHub App entities.
- **WebhookEvent** — audit log of incoming GitHub webhooks.

---

## 4. Key Files (with paths)

### Orchestration Core

| File | Responsibility |
|---|---|
| `src/modules/workflow/graph/workflow-executor.service.ts` | Graph invocation, terminal state translation → persisted status |
| `src/modules/workflow/graph/documentation-workflow.graph.ts` | LangGraph topology (nodes + edges). **Do not redesign.** |
| `src/modules/workflow/graph/workflow-node-adapters.ts` | Bridges nodes to execution wrapper; skip-on-resume logic |
| `src/modules/workflow/graph/workflow-node-execution.wrapper.ts` | Checkpoint persistence middleware (wraps every node call) |
| `src/modules/workflow/graph/graph.types.ts` | `WorkflowGraphAnnotation` (LangGraph state schema) |
| `src/modules/workflow/persistence/workflow-checkpoint.repository.ts` | All DB writes for WorkflowRun lifecycle |
| `src/modules/workflow/services/workflow.service.ts` | Facade: delegates start/resume/restart to executor |

### Graph Nodes (business logic only — no lifecycle state)

| File | Returns to graph state |
|---|---|
| `nodes/repository-analyzer.node.ts` | `workspacePath`, `repository`, `metadata` |
| `nodes/documentation-locator.node.ts` | `documentation` |
| `nodes/technical-writer.node.ts` | `generatedDocuments` |
| `nodes/documentation-critic.node.ts` | `criticReview` (writes critic Review record to DB) |
| `nodes/human-review.node.ts` | `humanReviewStatus` |
| `nodes/git-commit.node.ts` | `branchName`, `commitSha`, `gitOperationStatus` |
| `nodes/push-branch.node.ts` | `gitOperationStatus` |
| `nodes/create-pull-request.node.ts` | `pullRequest`, `pullRequestNumber`, `pullRequestUrl`, `gitOperationStatus` |

### Queue & Events

| File | Responsibility |
|---|---|
| `src/modules/queue/processors/workflow.processor.ts` | BullMQ consumer; publishes terminal progress events |
| `src/modules/queue/services/workflow-queue.service.ts` | Enqueues workflow jobs |
| `src/modules/realtime/services/workflow-event.service.ts` | Publishes Socket.IO events |

### Domain Types

| File | Exports |
|---|---|
| `src/domain/workflow/enums.ts` | `WorkflowStatus`, `GitOperationStatus` |
| `src/domain/workflow/checkpoint.types.ts` | `WorkflowNodeName`, `WorkflowStage`, `WorkflowCheckpointSnapshot` |
| `src/domain/workflow/workflow-state.ts` | `WorkflowState`, `CriticReview`, `GeneratedDocument`, etc. |
| `src/generated/prisma/enums.ts` | `RunStatus`, `WorkflowStage`, `ReviewStatus` (Prisma-generated) |

---

## 5. Critical Design Decisions (Do Not Violate)

### Decision 1: executionStatus is transient — never authoritative

`executionStatus` lives only inside `WorkflowGraphState` (LangGraph memory).
It is:
- **Overwritten** by `WorkflowNodeExecutionWrapper` to `Running` after every node.
- **Not persisted** to the database.
- **Not checkpointed** — lost if the process restarts.
- **Not restored** during workflow resume.
- **Not used** for graph routing.
- **Not used** by any user-facing API.

The only legitimate uses of `executionStatus`:
1. `WorkflowNodeExecutionWrapper` sets it to `Running` as a transient progress marker.
2. `WorkflowNodeAdapters` skip stubs set it to `Running` during recovery replay.
3. `WorkflowExecutorService` sets it on the return value so `WorkflowProcessor` knows which terminal event to publish.

**Never route the graph on `executionStatus`. Never persist it directly. Never use it in user-facing responses.**

### Decision 2: Business nodes must NOT set executionStatus

Every business node (`*Node.invoke()`) must return **only domain fields**:
- `criticReview`, `humanReviewStatus`, `repository`, `documentation`, `generatedDocuments`, `branchName`, `commitSha`, `gitOperationStatus`, `pullRequest*`

If a node returns `executionStatus`, remove it. Business meaning is encoded in domain fields.

### Decision 3: WorkflowRun.status is updated ONLY by WorkflowCheckpointRepository

All lifecycle transitions go through one of:
- `checkpointRepository.initializeRun()` → `RUNNING`
- `checkpointRepository.saveNodeCheckpoint(status: 'CHECKPOINTED' | 'FAILED')` → per-node
- `checkpointRepository.markRunCompleted()` → `COMPLETED`
- `checkpointRepository.markRunFailed()` → `FAILED`
- `checkpointRepository.markRunNeedsReview()` → `CHECKPOINTED`
- `checkpointRepository.resetRunForRestart()` → `RUNNING`

No other service or node should write `WorkflowRun.status` directly except through this repository.

**Exception:** `HumanReviewNode` does call `prisma.workflowRun.update({ status: RUNNING })` when creating a pending review. This is a legacy pattern — acceptable but should not be expanded.

### Decision 4: LangGraph topology is correct — do not redesign

The graph terminates at `END` in exactly four situations. All routing uses conditional edges on `criticReview.passed` and `humanReviewStatus`. Do not add new graph nodes or edges without understanding the full executor state machine.

### Decision 5: Optimistic locking on WorkflowRun.version

`saveNodeCheckpoint` validates `existing.version === expectedVersion` inside a Prisma transaction. This prevents concurrent job retries from corrupting checkpoint state. Always pass `expectedVersion` from the orchestration context.

---

## 6. Bugs Fixed (Do Not Reintroduce)

### Bug 1: Critic rejection → incorrectly persisted as COMPLETED ✅ Fixed

**Root cause:** After graph termination, the executor fell through to the success path regardless of `criticReview.passed`.

**Fix applied in** `workflow-executor.service.ts`:
```typescript
if (finalState.criticReview?.passed === false) {
  await this.checkpointRepository.markRunFailed(runId, 'Documentation critic rejected');
  this.eventService?.publishFailureEvent(…, WorkflowNodeName.DocumentationCritic);
  return { ...finalState, executionStatus: WorkflowStatus.ReviewFailed };
}
```
This check runs **before** the success path. It is present and correct.

---

### Bug 2: markRunNeedsReview → invalid Prisma status via unsafe cast ✅ Fixed

**Root cause:** An earlier version used a raw string cast (`'NEEDS_REVIEW' as any`) which is not a valid `RunStatus` enum value.

**Fix applied in** `workflow-checkpoint.repository.ts`:
```typescript
status: PrismaRunStatus.CHECKPOINTED,  // type-safe constant, valid DB value
```
`CHECKPOINTED` is the correct DB representation for "suspended awaiting human review".

---

### Bug 3: Queue processor always fired Completed event ✅ Fixed

**Root cause:** The processor called a single hard-coded "completed" progress event regardless of the actual outcome.

**Fix applied in** `workflow.processor.ts`: A dedicated `buildTerminalProgressEvent()` switch dispatches on `finalState.executionStatus`:

```
NeedsReview   → queueStatus: Waiting,   realtimeStatus: 'waiting',   realtimeStage: Reviewing
ReviewFailed  → queueStatus: Failed,    realtimeStatus: 'failed',    realtimeStage: Reviewing
Completed     → queueStatus: Completed, realtimeStatus: 'completed', realtimeStage: Completed
```

---

## 7. Workflow Resume / Restart

### Resume (crashed or paused runs)

1. Load `WorkflowRun` from DB → extract `checkpointSnapshot`.
2. Call `determineNextNode(lastCompletedNode)` to find the first node to re-execute.
3. `WorkflowNodeAdapters.shouldSkip()` skips all nodes before `firstNodeToExecute`.
4. Skipped nodes return `{ currentNode, executionStatus: Running }` without touching the DB.
5. Real execution resumes from the correct node.

### Restart (explicit full restart)

1. `resetRunForRestart()` clears checkpoint snapshot, resets version, sets status `RUNNING`.
2. Graph executes from `RepositoryAnalyzer` with no state override.

### Human Review Resume

When `humanReviewStatus === 'PENDING'` the run is left as `CHECKPOINTED`.
When a human approves/rejects via the review API, a new job is enqueued in `resume` mode.
`HumanReviewNode.invoke()` reads the existing `Review` record and returns its current status.

---

## 8. Testing

### Test Runner

```bash
# Run all unit tests
npm run test         # from apps/backend/

# TypeScript type check (no emit)
npx tsc --noEmit     # from apps/backend/
```

Uses **Node.js built-in test runner** (`node:test`) — not Jest, not Vitest.

### Current Test Results (as of 2026-06-27)

```
tests:  79
pass:   79
fail:   0
TypeScript errors: 0
```

### Test Files

| File | Covers |
|---|---|
| `queue.spec.ts` | WorkflowQueueService (producer), WorkflowProcessor (consumer) — all 4 terminal event cases |
| `human-review-workflow.spec.ts` | HumanReviewNode, CreatePullRequestNode, GitOperationsService safety checks |
| `workflow.service.spec.ts` | WorkflowService facade delegation |
| `document-review.service.spec.ts` | DocumentReviewService critic logic |
| `retry-policy.service.spec.ts` | AI retry/backoff policy |
| `technical-writer.service.spec.ts` | DocumentGenerationService pipeline |
| `repositories-sync.spec.ts` | Repository sync service |
| `git.service.spec.ts` | Git operations |
| `repository-clone.service.spec.ts` | Clone service |
| `workspace.service.spec.ts` | Workspace management |
| `output-parser.service.spec.ts` | LLM output parsing |
| `prompt-builder.service.spec.ts` | Prompt building |
| `markdown-validator.service.spec.ts` | Markdown validation |
| `review-evaluator.service.spec.ts` | Review evaluation |
| `commit-workflow.service.spec.ts` | Commit workflow |
| `github-auth.service.spec.ts` | GitHub auth |
| `repository-context-builder.service.spec.ts` | Context building |

### Testing Checklist for New Changes

Before merging any change:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run test` — all existing tests pass
- [ ] If modifying `WorkflowExecutorService` — manually verify all four termination paths
- [ ] If modifying `WorkflowCheckpointRepository` — ensure all status writes use `PrismaRunStatus.*` (never raw strings)
- [ ] If modifying a graph node — confirm the node does NOT return `executionStatus`
- [ ] If modifying queue events — verify `buildTerminalProgressEvent` still covers all `WorkflowStatus` values
- [ ] If modifying the graph topology — update this document's diagram in Section 2

---

## 9. Remaining Work & Known Limitations

### Low Priority / Cosmetic

- **Skip stub `executionStatus`:** `WorkflowNodeAdapters` skip stubs return `executionStatus: Running` in recovery mode. This is overwritten immediately by the wrapper on the next real node and has no behavioral impact. Can be removed to reduce noise.

- **HumanReviewNode direct DB write:** `HumanReviewNode` calls `prisma.workflowRun.update({ status: RUNNING })` directly, bypassing `WorkflowCheckpointRepository`. Not harmful, but inconsistent with the architectural principle that all lifecycle writes go through the repository.

### Not Yet Covered

- **Integration tests** — require live PostgreSQL + Redis + BullMQ. None exist yet.
- **E2E tests** — require GitHub App credentials. None exist yet.
- **Cancellation flow** — `CANCELLED` status exists in the DB enum but no explicit cancel API/job is wired.
- **Worker app cleanup** — `apps/worker/` was gutted in the last commit (processing moved into the backend). The directory exists but is empty; its `package.json` can be removed.

---

## 10. Environment & Running Locally

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
pnpm --filter backend exec prisma migrate dev

# Start backend (development)
pnpm --filter backend run start:dev

# Run tests
pnpm --filter backend run test
```

Key environment variables (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string  
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key
- `WORKFLOW_MIN_DOC_SCORE` — critic pass threshold (default: 80)

---

*End of PROJECT_STATUS.md — update this file whenever architecture changes, bugs are fixed, or new tests are added.*
