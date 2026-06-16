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

- Multi-database fleet dashboard with health cards, comparison charts, and quick-actions (shown when multiple connections are configured).
- Overview dashboard with table/collection counts and data distribution.
- Data explorer with table, document, JSON, and inspector views — pagination, column filtering, CSV export, and sensitive field masking.
- Schema visualizer for relational databases.
- Query workspace with SQL and MongoDB modes, bookmarks, and history.
- Read-only backend safeguards.

### Docker mode

- Live container list with CPU %, memory, port bindings, and health status.
- Start, stop, restart, and delete containers individually or in bulk.
- Container launcher — search Docker Hub, configure ports / volumes / env vars, and run containers with a live progress log.
- Generate and export a `docker-compose.yml` for your setup.
- Browse, search, and bulk-delete local images and volumes.
- Container logs with clipboard copy.


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