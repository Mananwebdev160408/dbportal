# dbportal

`dbportal` is a local developer tool for inspecting databases and managing Docker containers from one browser UI.

## Install

### As a dev dependency (recommended)

```bash
npm install --save-dev dbportal
```

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "db": "dbportal",
    "db:docker": "dbportal --docker"
  }
}
```

### Or use directly with npx (no install needed)

```bash
npx dbportal
npx dbportal --docker
```

## Quick start

### Database mode

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
npm run db
```


Optional additional connections:

```bash
DATABASE_URL_1=mongodb://localhost:27017/logs
DATABASE_URL_2=sqlite:./local.db
```

### Docker mode

No database credentials required. Just run:

```bash
npm run db:docker
```

Requires Docker Desktop (or Docker Engine) to be running on the same machine.

## CLI flags

| Flag | Description |
|------|-------------|
| `--docker` | Start in Docker mode |
| `--port <n>` | Port to listen on (default 3000) |
| `--host <addr>` | Bind address (default 127.0.0.1) |

## Supported databases

- PostgreSQL / CockroachDB
- MongoDB
- MySQL / MariaDB
- SQLite
- SQL Server
- Redis

## What you get

### Database mode

- Overview dashboard with counts and record distribution.
- **Multi-database fleet dashboard** — summary bar, per-database health cards, cross-database comparison charts, and quick-action shortcuts when multiple connections are configured.
- Data explorer with table, document, JSON, and inspector views.
  - **Pagination** with configurable page size.
  - **Draggable column resizing** — drag any column header border to resize.
  - **Per-column inline filters** — type in the filter row and press Enter.
  - **Row-range indicator** showing current page and exact row numbers.
  - **Export CSV** — download the current result set as a `.csv` file.
  - **Sensitive column masking** — hides `password`, `token`, and `secret` columns behind `*****`.
  - **Skeleton loaders** while data fetches.
  - **Row count badge** next to each table name in the sidebar.
  - **Friendly error UI** with a Retry button on failed requests.
- Schema visualizer for relational databases.
- Query workspace with SQL, Mongo structured queries, and Mongo aggregation examples.
  - **Query bookmarks** — save and recall frequent queries.
  - **Execution time badge** after every query run.
  - **Ctrl + Enter** shortcut to run queries.
  - **Copy-to-clipboard** for query results.
- Read-only backend safeguards.

### Docker mode

- Live container list with running / stopped grouping and health indicators.
- Per-container CPU %, memory, and port bindings.
- Start, stop, restart, and delete containers.
- **Bulk actions** — select multiple containers and stop or delete them all at once.
- **Container launcher** — search Docker Hub, pick a tag, configure ports / volumes / env vars, set a custom command or enable TTY (`-it`), and launch containers with a live execution log.
- Generate and export a `docker-compose.yml` for your configuration.
- **Images tab** — browse, search, and bulk-delete local images.
- **Volumes tab** — browse, search, and bulk-delete local volumes.
- Container logs with auto-scroll and clipboard copy.

## Read-only safeguards (database mode)

- Write API routes are removed.
- Mutating SQL statements are blocked.
- MongoDB `$out` and `$merge` are blocked.
- Table editing in the UI is disabled.

## Package contents

- `dist/` compiled backend
- `frontend/dist/` compiled dashboard
- `bin/` executable launcher

## License

MIT