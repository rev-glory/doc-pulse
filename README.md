
# DocPulse

AI-powered documentation automation platform for GitHub repositories.

DocPulse automatically analyzes source code, generates technical documentation using Large Language Models (LLMs), routes the generated documentation through a human review workflow, and publishes approved documentation back to GitHub as Pull Requests.

The platform combines AI agents, workflow orchestration, GitHub Apps, and real-time monitoring to provide an end-to-end documentation automation pipeline.

---

## Features

### AI Documentation Generation

- Automated repository analysis
- Context-aware documentation generation
- Previous documentation used as generation context
- Multi-stage AI workflow
- Multi-LLM architecture

### Workflow Orchestration

- LangGraph-powered workflow engine
- Checkpointing and workflow resumption
- Human-in-the-loop approval workflow
- Automatic retry handling
- Early skip support
- Real-time workflow execution tracking

### GitHub Integration

- GitHub App authentication
- Repository synchronization
- Secure webhook processing
- Automatic Pull Request creation
- Configurable branch strategies
- Custom documentation branch support

### Repository Management

- Repository activation and deactivation
- Documentation directory configuration
- Custom documentation paths
- Branch strategy management
- Repository settings management

### Dashboard

- Repository management
- Workflow monitoring
- Documentation review queue
- Pull Request tracking
- Real-time updates using Socket.IO
- Project analytics

### Reliability

- Unified LLM error handling
- Unified Git error handling
- Queue-based execution using BullMQ
- Workspace lifecycle management
- Automatic cleanup
- Fault-tolerant workflow execution

---

## Architecture

```text
                GitHub Push Event
                       │
                       ▼
               GitHub Webhook
                       │
                       ▼
               NestJS Backend API
                       │
                       ▼
              BullMQ Job Queue
                       │
                       ▼
            LangGraph Workflow Engine
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
 Source Code Analysis         Existing Documentation
        │                             │
        └──────────────┬──────────────┘
                       ▼
          AI Documentation Generation
                       │
                       ▼
            Documentation Quality Review
                       │
             Human Approval Required
                       │
                       ▼
              Git Commit & Push Changes
                       │
                       ▼
            Automatic Pull Request Creation
````

---

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* TanStack Query
* Socket.IO Client

### Backend

* NestJS
* TypeScript
* PostgreSQL
* Prisma ORM
* Redis
* BullMQ
* LangGraph
* GitHub App APIs

### AI

* LangGraph
* Multi-LLM Architecture
* Structured AI Agents

---


## Workflow

1. User installs the GitHub App.
2. Repository is connected to DocPulse.
3. GitHub Push Event triggers the workflow.
4. Repository is cloned.
5. Source code is analyzed.
6. Existing documentation is loaded as context.
7. AI generates updated documentation.
8. Generated documentation undergoes quality review.
9. User approves or requests regeneration.
10. Documentation changes are committed.
11. A Pull Request is automatically created.

---

## Screenshots

### Dashboard

<p align="center">
  <img src="./images/dashboard.png" alt="Dashboard" width="900">
</p>

---

### Repository Management

<p align="center">
  <img src="./images/repositories.png" alt="Repositories" width="900">
</p>

---

### Workflow Execution

<p align="center">
  <img src="./images/workflow.png" alt="Workflow" width="900">
</p>

---

### Documentation Review

<p align="center">
  <img src="./images/human_review.png" alt="Human Review" width="900">
</p>

---

### Pull Request

<p align="center">
  <img src="./images/pr.png" alt="Pull Request" width="900">
</p>

---

### Settings

<p align="center">
  <img src="./images/settings.png" alt="Settings" width="900">
</p>

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/rev-glory/doc-pulse
cd docpulse
```

### Install Dependencies

```bash
pnpm install
```

### Environment Configuration

Create the required environment files:

```text
/.env
```

Configure the following services:

* PostgreSQL
* Redis
* GitHub App
* LLM Provider(s)

### Run the Application

Backend

```bash
pnpm --filter backend dev
```

Frontend

```bash
pnpm --filter frontend dev
```

---

## Key Implementations

* GitHub App Integration
* LangGraph Workflow Orchestration
* Queue-Based Background Processing
* Human-in-the-Loop Documentation Review
* Multi-LLM Provider Architecture
* Previous Documentation Context Injection
* Unified LLM Error Handling
* Unified Git Error Handling
* Configurable Branch Strategies
* Documentation Directory Support
* Early Skip and Workflow Cancellation
* Real-Time Workflow Updates
* Workspace Lifecycle Management
* Automatic Pull Request Generation

---

## Future Enhancements

* Authenticated cloning for private repositories
* Incremental documentation generation
* CI/CD pipeline
* Automated integration and end-to-end testing
* Notification system
* Monitoring and observability
* Additional LLM providers
* Advanced workflow analytics

---

## Author

**Abhinav Bansal**

GitHub: https://github.com/rev-glory

LinkedIn: https://linkedin.com/in/abhinav-bansal4



