# dbportal

`dbportal` is a local, read-only database explorer for developers. It connects to multiple databases from connection strings, serves a browser-based dashboard, and exposes read-only browsing and query tools.

## Install

```bash
npm install dbportal
```

## Quick start

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
npx dbportal
```

Optional additional connections:

```bash
DATABASE_URL_1=mongodb://localhost:27017/logs
DATABASE_URL_2=sqlite:./local.db
```

## Supported databases

- PostgreSQL
- MongoDB
- MySQL / MariaDB
- SQLite
- SQL Server
- Redis

## What you get

- Overview dashboard with counts and record distribution.
- Data explorer with table, document, JSON, and inspector views.
- Schema visualizer for relational databases.
- Query workspace with SQL, Mongo structured queries, and Mongo aggregation examples.
- Read-only backend safeguards.

## Read-only safeguards

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