# dbportal

`dbportal` is a local database explorer for developers who want one tool to inspect multiple databases, browse records, understand schema shape, and run read-only queries from a browser UI.

It starts a local Express server, detects connections from `DATABASE_URL` and optional `DATABASE_URL_1` to `DATABASE_URL_10`, then opens a React dashboard for inspection and analysis.

## What it does

- Connects to PostgreSQL, MongoDB, MySQL/MariaDB, SQLite, SQL Server, and Redis.
- Supports multiple live connections in one session.
- Shows an overview dashboard with counts, distribution charts, and top-object insights.
- Browses tables and collections in table, document, JSON, and inspector views.
- Visualizes relational schema graphs using foreign keys and column metadata.
- Provides a query workspace for SQL drivers and MongoDB structured queries.
- Runs in a local-only server bound to `127.0.0.1`.
- Enforces a read-only editing model in this build.

## Current architecture

- Backend: Node.js, Express, TypeScript.
- Database access: native drivers, not an ORM.
- Frontend: React + Vite + TypeScript.
- Packaging: CLI entry point plus compiled browser assets bundled into the npm package.

## Supported databases

| Protocol | Database | Example |
| --- | --- | --- |
| `postgres://`, `postgresql://` | PostgreSQL | `postgres://user:pass@localhost:5432/app` |
| `mongodb://`, `mongodb+srv://` | MongoDB | `mongodb://localhost:27017/app` |
| `mysql://`, `mariadb://` | MySQL / MariaDB | `mysql://root:pass@localhost:3306/app` |
| `sqlite:` | SQLite | `sqlite:./data/app.sqlite` |
| `mssql://`, `sqlserver://` | SQL Server | `mssql://sa:pass@localhost:1433/master` |
| `redis://`, `rediss://` | Redis | `redis://localhost:6379` |

## Main features

### Overview dashboard

- Total tables / collections and record counts.
- Data distribution donut for the active database.
- Top object bars and explanatory insights.
- Click-through navigation into a selected table or collection.

### Data explorer

- Table view for rows and columns.
- Document cards for record inspection.
- JSON view for raw payloads.
- Inspector view for field-by-field analysis.
- Sidebar object filtering and database switching.

### Schema visualizer

- Auto-generated graph from relational metadata.
- Foreign-key edges and column summaries.
- Table inspector with columns and relationships.

### Query workspace

- SQL query mode for relational drivers.
- MongoDB structured query mode with filter, projection, sort, and limit.
- Mongo aggregation pipeline mode with example pipelines.
- Recent query history stored in local storage.
- Result rendering as table or JSON.

## Read-only behavior

This build is intentionally read-only.

- Write endpoints were removed from the backend.
- Mutating SQL statements are blocked at the server.
- MongoDB `$out` and `$merge` pipeline stages are blocked.
- Inline edit and update behavior was removed from the table UI.

Use read-only database credentials if you want an additional database-level safety layer.

## Environment variables

Create a `.env` file in the project root.

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
DATABASE_URL_1=mongodb://localhost:27017/logs
DATABASE_URL_2=sqlite:./local.db
PORT=3000
```

Only `DATABASE_URL` is required. Additional numbered URLs are optional.

## Installation

### Run with npx

```bash
npx dbportal
```

### Install globally

```bash
npm install -g dbportal
dbportal
```

### Develop from this repository

```bash
npm install
npm run dev
npm run dev:ui
npm run build
```

## API endpoints

- `GET /api/connections`
- `GET /api/tables?dbId=...`
- `GET /api/capabilities?dbId=...`
- `GET /api/overview?dbId=...`
- `GET /api/schema?dbId=...`
- `GET /api/data/:name?dbId=...&limit=...`
- `POST /api/query?dbId=...`

## Query format examples

### SQL

```json
{ "query": "SELECT * FROM users LIMIT 50" }
```

### MongoDB structured query

```json
{
   "query": {
      "collection": "users",
      "filter": { "status": "active" },
      "projection": { "name": 1, "email": 1 },
      "sort": { "createdAt": -1 },
      "limit": 25
   }
}
```

### MongoDB aggregation pipeline

```json
{
   "query": {
      "collection": "orders",
      "pipeline": [
         { "$match": { "status": { "$exists": true } } },
         { "$group": { "_id": "$status", "total": { "$sum": 1 } } },
         { "$sort": { "total": -1 } }
      ]
   }
}
```

## Publishing notes

- The package ships the compiled backend in `dist/` and the built frontend in `frontend/dist/`.
- npm publish currently requires an account token or 2FA OTP on your account.
- The package name is `dbportal` and the current version is `1.0.0`.

## Repository layout

- `src/` backend source
- `frontend/` React UI source and build output
- `bin/cli.js` executable launcher
- `dist/` compiled package artifacts

## License

MIT © Manan Gupta

