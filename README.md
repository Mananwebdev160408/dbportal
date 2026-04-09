# dbportal

CLI-first universal database explorer for local development.

dbportal detects your database from `DATABASE_URL`, starts a local server, and opens an interactive dashboard with browsing, insights, and query tooling.

## Highlights

- Native-driver architecture (no ORM)
- Multi-database support (PostgreSQL, MongoDB, MySQL/MariaDB)
- Modern React dashboard served locally
- Overview analytics with visual insights
- Multiple data views: table, documents, JSON, inspector
- Query workspace with capability-aware modes
- Local-only bind for safety (`127.0.0.1`)

## Supported Databases
npm
- PostgreSQL: `postgres://`, `postgresql://` via `pg`
- MongoDB: `mongodb://`, `mongodb+srv://` via `mongodb`
- MySQL/MariaDB: `mysql://`, `mariadb://` via `mysql2`

## Install

```bash
npm install dbportal
```

For local development in this repository:

```bash
npm install
```

## Quick Start

1. Create `.env` in project root:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
# or
# DATABASE_URL=mongodb://localhost:27017/my_db
# or
# DATABASE_URL=mysql://user:password@localhost:3306/my_db
```

2. Run the app:

```bash
npx dbportal
```

For local repository execution:

```bash
npm run build
node dist/cli.js
```

dbportal will:

1. Detect the database from `DATABASE_URL`
2. Connect using the matching native driver
3. Start Express on `127.0.0.1` (default port `3000`, auto-fallback if occupied)
4. Open the browser to the dashboard

## Dashboard Features

### Overview

- Database-level metrics (tables/collections, records, active objects)
- Distribution chart and top-object bar chart
- Explainability cards with concentration and action hints
- Clickable object rows/bars to jump into data view

### Data Explorer

- Sidebar navigation for tables/collections
- Modes:
	- Table view
	- Document cards view
	- JSON view
	- Inspector view (record list + field detail)
- Reload support for live updates
- Light and dark theme toggle

### Query Workspace

- Capability-aware query UI by driver
- SQL raw query mode for PostgreSQL/MySQL
- Structured JSON mode for MongoDB
- Result rendering as table or JSON
- Query history (local storage)

## API Endpoints

- `GET /api/tables`
	- Returns list of tables/collections and db type
- `GET /api/capabilities`
	- Returns driver capabilities (`rawQuery`, `structuredQuery`)
- `GET /api/overview`
	- Returns overview metrics and per-object counts
- `GET /api/data/:name?limit=100`
	- Returns rows/documents for the given object
- `POST /api/query`
	- Executes query payload
	- SQL drivers: string query
	- MongoDB: structured object

Example MongoDB query body:

```json
{
	"query": {
		"collection": "users",
		"filter": { "isActive": true },
		"projection": { "name": 1, "email": 1 },
		"sort": { "createdAt": -1 },
		"limit": 50
	}
}
```

Example SQL query body:

```json
{
	"query": "SELECT * FROM users ORDER BY created_at DESC LIMIT 50"
}
```

## Architecture

dbportal uses a driver adapter pattern with protocol-based registration.

- Driver contract: `src/drivers/types.ts`
- Built-in drivers: `src/drivers/postgres-driver.ts`, `src/drivers/mongodb-driver.ts`, `src/drivers/mysql-driver.ts`
- Registry + manager: `src/index.ts`

To add another database:

1. Implement `DatabaseDriver`
2. Register protocol mapping via `registerDatabaseDriver`
3. Expose driver capabilities for query mode behavior

## Scripts

- `npm run dev` - watch backend builds (tsup)
- `npm run dev:ui` - run frontend (Vite)
- `npm run lint` - TypeScript checks
- `npm run build` - build frontend + backend artifacts
- `npm run format` - format backend TypeScript sources

## Notes

- Server binds to `127.0.0.1` only.
- Query execution is powerful; use trusted environments and DB roles with minimal privileges.

## License

MIT
