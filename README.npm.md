# dbportal

Universal local database explorer for PostgreSQL, MongoDB, and MySQL.

`dbportal` is a CLI-first tool that detects your database from `DATABASE_URL`, starts a local server, and opens an interactive dashboard for browsing data, running queries, and viewing insights.

## Features

- Native driver architecture (no ORM)
- Supported DBs:
  - PostgreSQL (`postgres://`, `postgresql://`)
  - MongoDB (`mongodb://`, `mongodb+srv://`)
  - MySQL/MariaDB (`mysql://`, `mariadb://`)
- Multiple data views: table, documents, JSON, inspector
- Query workspace:
  - SQL raw query mode (PostgreSQL/MySQL)
  - Structured JSON mode (MongoDB)
- Dashboard insights with overview metrics and charts
- Runs on `127.0.0.1` for local safety

## Install

```bash
npm install dbportal
```

## Quick Start

1. Create `.env`:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
# or
# DATABASE_URL=mongodb://localhost:27017/my_db
# or
# DATABASE_URL=mysql://user:password@localhost:3306/my_db
```

2. Run:

```bash
npx dbportal
```

## API

- `GET /api/tables`
- `GET /api/capabilities`
- `GET /api/overview`
- `GET /api/data/:name?limit=100`
- `POST /api/query`

SQL query example:

```json
{ "query": "SELECT * FROM users LIMIT 50" }
```

Mongo query example:

```json
{
  "query": {
    "collection": "users",
    "filter": { "isActive": true },
    "sort": { "createdAt": -1 },
    "limit": 50
  }
}
```

## Notes

- Best for development and local exploration.
- Query execution uses your DB user's permissions.

## License

MIT
