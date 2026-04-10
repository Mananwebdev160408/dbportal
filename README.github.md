# dbportal

`dbportal` is a local database explorer for developers who need a fast way to inspect several databases, analyze schema shape, and run read-only queries from one browser UI.

## Highlights

- Multiple connections in one session.
- PostgreSQL, MongoDB, MySQL/MariaDB, SQLite, SQL Server, and Redis support.
- Overview dashboard with record counts and distribution charts.
- Table, document, JSON, and inspector views.
- Schema visualizer for relational databases.
- Query workspace with SQL, Mongo structured queries, and aggregation examples.
- Local-only server bound to `127.0.0.1`.
- Read-only behavior enforced in the current build.

## Why it exists

This project is designed for local database exploration and debugging, not for managing users, roles, or remote multi-tenant access. The goal is to give you fast visibility into database structure and data without needing an ORM or a heavy admin stack.

## Install

```bash
npm install dbportal
```

## Quick start

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
npx dbportal
```

## Read-only mode

- Write endpoints are removed.
- Mutating SQL statements are blocked.
- MongoDB write aggregation stages are blocked.
- Table editing is disabled.

## Supported database protocols

- `postgres://`, `postgresql://`
- `mongodb://`, `mongodb+srv://`
- `mysql://`, `mariadb://`
- `sqlite:`
- `mssql://`, `sqlserver://`
- `redis://`, `rediss://`

## Development

```bash
npm install
npm run dev
npm run dev:ui
npm run build
```

## License

MIT