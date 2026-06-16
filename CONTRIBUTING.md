# Contributing to dbportal

Thank you for your interest in contributing to **dbportal**!

Whether you're fixing a typo, adding a feature, or improving documentation — every contribution matters. This guide will walk you through everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Finding Issues to Work On](#finding-issues-to-work-on)
- [Making Changes](#making-changes)
- [Commit Message Format](#commit-message-format)
- [Opening a Pull Request](#opening-a-pull-request)
- [Code Style Guidelines](#code-style-guidelines)
- [GSSoC Participants](#gssoc-participants)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

| Tool | Version |
| ---- | ------- |
| Node.js | `>= 18.x` |
| npm | `>= 9.x` |
| Git | any recent version |

You will also need access to at least one database to test against (PostgreSQL, MongoDB, MySQL, SQLite, SQL Server, or Redis).

---

## Project Structure

```
dbportal/
├── src/                    # Backend — Node.js + Express + TypeScript
│   ├── index.ts            # Express server, route definitions
│   ├── cli.ts              # CLI entry point + all API route handlers
│   ├── docker-service.ts   # Docker daemon adapter (containers, images, volumes)
│   └── drivers/            # Database-specific driver implementations
│       ├── types.ts        # Shared driver interface
│       ├── postgres-driver.ts
│       ├── mongodb-driver.ts
│       ├── mysql-driver.ts
│       ├── sqlite-driver.ts
│       ├── mssql-driver.ts
│       └── redis-driver.ts
├── frontend/               # Frontend — React + Vite + TypeScript
│   └── src/
│       ├── App.tsx         # Root component and app state (db + docker modes)
│       ├── index.css       # Global styles and design tokens
│       └── components/     # UI components
│           ├── Icons.tsx           # Shared SVG icon set (no emoji, no icon library)
│           ├── Sidebar.tsx         # Database mode sidebar
│           ├── DockerSidebar.tsx   # Docker mode sidebar with bulk select
│           ├── Toolbar.tsx
│           ├── EmptyState.tsx
│           └── views/
│               ├── DockerDashboardView.tsx  # Container metrics + logs
│               ├── DockerRunnerView.tsx     # Container launcher + compose export
│               ├── DockerImagesView.tsx     # Local images browser
│               ├── DockerVolumesView.tsx    # Local volumes browser
│               └── ...                      # Database Explorer view modes
├── bin/
│   └── cli.js              # Compiled CLI launcher (do not edit directly)
├── dist/                   # Compiled backend output (git-ignored)
├── .github/                # Issue/PR templates and CI workflows
├── .env.example            # Environment variable template
├── package.json
└── tsconfig.json
```

---

## Development Setup

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/dbportal.git
cd dbportal
```

### 2. Install Dependencies

```bash
# Root dependencies (backend)
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Set Up Environment

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and add at least one database connection:

```env
DATABASE_URL=postgres://user:password@localhost:5432/my_db
PORT=3000
```

### 4. Run in Development Mode

You need **two terminals** running simultaneously:

**Terminal 1 — Backend (with hot reload):**
```bash
npm run dev
```

**Terminal 2 — Frontend (Vite dev server):**
```bash
npm run dev:ui
```

Then open `http://localhost:5173` in your browser. The frontend proxies API calls to the backend at `http://localhost:3000`.

> **Testing Docker mode locally**: start the backend with `npm run dev` then add `--docker` to the nodemon command (or run `node dist/cli.cjs --docker --port 5656` after a build). The frontend Vite server at port 5173 proxies all `/api/` requests to the backend.

### 5. Build for Production

```bash
npm run build
```

This compiles both frontend and backend and bundles them for npm publishing.

### 6. Type Check

```bash
npm run lint
```

This runs `tsc --noEmit` to check for TypeScript errors without emitting files.

---

## Finding Issues to Work On

- Browse [open issues](https://github.com/Mananwebdev160408/dbportal/issues)
- Filter by [`good-first-issue`](https://github.com/Mananwebdev160408/dbportal/issues?q=is%3Aissue+is%3Aopen+label%3Agood-first-issue) for beginner-friendly tasks
- Filter by [`help-wanted`](https://github.com/Mananwebdev160408/dbportal/issues?q=is%3Aissue+is%3Aopen+label%3Ahelp-wanted) for more involved contributions
- Check [Discussions](https://github.com/Mananwebdev160408/dbportal/discussions) if you want to propose something before opening an issue

> **Always comment on an issue before starting work** to avoid duplicate effort. Wait for a maintainer to assign it to you.

---

## Making Changes

### 1. Create a Branch

Always branch off from `main`:

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

**Branch naming convention:**

| Type | Example |
| ---- | ------- |
| Feature | `feat/add-csv-export` |
| Bug fix | `fix/sidebar-filter-crash` |
| Docs | `docs/update-readme` |
| Refactor | `refactor/query-handler` |
| Test | `test/add-driver-unit-tests` |
| CI | `ci/add-github-actions` |

### 2. Make Your Changes

- Keep changes focused — one concern per PR
- Add comments for non-obvious logic
- Do not commit `.env`, `node_modules`, or `dist/`

### 3. Verify Before Committing

```bash
# Type check — must pass with zero errors
npm run lint

# Format code (if prettier is configured)
npm run format
```

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>(<scope>): <short description>
```

**Types:**

| Type | When to use |
| ---- | ----------- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or updating tests |
| `ci` | CI/CD config changes |
| `chore` | Tooling, dependencies, build scripts |

**Examples:**

```
feat(frontend): add copy-to-clipboard button in query results
fix(postgres-driver): handle null values in schema query
docs: add screenshots to README
ci: add GitHub Actions workflow for type checking
```

---

## Opening a Pull Request

1. Push your branch: `git push origin feat/your-feature-name`
2. Open a PR against the `main` branch on GitHub
3. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) completely
4. Link the issue your PR resolves (e.g., `Closes #12`)
5. Wait for a review — a maintainer will respond within a few days

### PR Checklist

- [ ] `npm run lint` passes with no errors
- [ ] Changes are tested locally against a real database connection or Docker daemon
- [ ] No unrelated files are changed
- [ ] The PR description clearly explains what and why

---

## Code Style Guidelines

- **TypeScript**: strict mode is enabled; avoid `any` unless absolutely necessary
- **Formatting**: Prettier is configured — run `npm run format` before committing
- **No ORM**: database access uses native drivers only (by design)
- **No frontend framework additions**: the frontend uses React + Vite; do not add large dependencies without discussion
- **Icons**: use the shared `Icons.tsx` SVG set — do not add emoji or third-party icon libraries. Add new icons to `Icons.tsx` if needed.
- **Read-only guarantee**: do not add write/mutate endpoints to the database backend — this is a core design constraint (Docker management endpoints are an intentional exception)
- **Component scope**: keep React components focused and small; extract logic into hooks or utilities when components grow large

---

## GSSoC Participants

Welcome to GSSoC! Here are some tips to get started quickly:

1. **Star and fork** the repository first
2. Look for issues labeled [`good-first-issue`](https://github.com/Mananwebdev160408/dbportal/issues?q=label%3Agood-first-issue) + [`gssoc`](https://github.com/Mananwebdev160408/dbportal/issues?q=label%3Agssoc)
3. Comment on the issue: *"Hey, I'd like to work on this as part of GSSoC — could you assign it to me?"*
4. Set up the project locally (takes ~10 min, see [Development Setup](#development-setup))
5. Keep your PRs small and focused — one issue per PR
6. Reach out in [Discussions](https://github.com/Mananwebdev160408/dbportal/discussions) if you're stuck

> All GSSoC contributions are tracked via the `gssoc` label on issues and PRs.

---

## Need Help?

- [Join our Discord Server](https://discord.gg/YnRq6df2RY) — chat with maintainers, get help setting up, or collaborate with fellow contributors
- [GitHub Discussions](https://github.com/Mananwebdev160408/dbportal/discussions) — general questions, ideas, and feedback
- [Open an Issue](https://github.com/Mananwebdev160408/dbportal/issues/new/choose) — for bug reports and feature requests

Thank you for contributing!
