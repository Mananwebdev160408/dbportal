# dbportal

[![Open Issues](https://img.shields.io/github/issues/Mananwebdev160408/dbportal?color=blue&style=flat-square)](https://github.com/Mananwebdev160408/dbportal/issues)
[![Open PRs](https://img.shields.io/github/issues-pr/Mananwebdev160408/dbportal?color=orange&style=flat-square)](https://github.com/Mananwebdev160408/dbportal/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/Mananwebdev160408/dbportal?style=flat-square)](https://github.com/Mananwebdev160408/dbportal/commits/main)
[![License](https://img.shields.io/github/license/Mananwebdev160408/dbportal?style=flat-square)](https://github.com/Mananwebdev160408/dbportal/blob/main/LICENSE)
[![GSSoC 2026](https://img.shields.io/badge/GSSoC-2026-pink?style=flat-square)](https://gssoc.girlscript.tech/)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289DA?style=flat-square&logo=discord)](https://discord.gg/YnRq6df2RY)

> [!IMPORTANT]
> ### 💬 Join our Discord Community!
> Connect with other developers, collaborate with contributors, share feature ideas, and get support directly from the maintainers.
> 👉 **[Click here to join the dbportal Discord Server](https://discord.gg/YnRq6df2RY)**

`dbportal` is a local developer tool for inspecting databases **and** managing Docker containers — all from one browser UI.

In **database mode** it starts a local Express server, detects connections from `DATABASE_URL` and optional `DATABASE_URL_1` to `DATABASE_URL_10`, then opens a React dashboard for browsing, querying, and analysing your data.

In **Docker mode** it connects to the local Docker daemon and gives you a live container manager, image browser, and volume browser without any additional setup.

### 🗺️ [View the Project Roadmap (Kanban Board)](https://github.com/users/Mananwebdev160408/projects/2)

---

## Modes

### Database mode (default)

Run without any flags to start in database mode:

```bash
npx dbportal
```

Reads `DATABASE_URL` (and up to 10 numbered variants) from a `.env` file in the current directory.

### Docker mode

Run with the `--docker` flag to connect to your local Docker daemon:

```bash
npx dbportal --docker
```

No `.env` or database credentials needed. Requires Docker Desktop (or Docker Engine) to be running on the same machine.

---

## What it does

### Database mode

- Connects to PostgreSQL / CockroachDB, MongoDB, MySQL / MariaDB, SQLite, SQL Server, and Redis.
- Supports multiple live connections in one session.
- **Multi-database fleet dashboard** — when multiple connections are configured, a summary page shows combined totals, per-database health cards, cross-database size comparison bars, database-type distribution donut chart, and quick-action shortcuts.
- Shows an overview dashboard per database with counts, distribution charts, and top-object insights.
- Browses tables and collections in table, document, JSON, and inspector views.
- Visualizes relational schema graphs using foreign keys and column metadata.
- Provides a query workspace for SQL drivers and MongoDB structured queries.
- Runs in a local-only server bound to `127.0.0.1`.
- Enforces a read-only editing model in this build.

### Docker mode

- Lists all running and stopped containers with health indicators.
- Shows live CPU and memory metrics per container.
- Start, stop, restart, and delete individual containers from the UI.
- **Bulk selection** — select multiple containers and stop or delete them all at once.
- **Container launcher** — pull and run new containers directly from the UI:
  - Docker Hub image search with tag selection.
  - Port bindings, volume mounts, and environment variable configuration.
  - Command override and interactive TTY (`-it`) support.
  - Auto-populates sensible defaults for common images (Redis, Postgres, MySQL, Mongo…).
  - Generates and exports a `docker-compose.yml` for your configuration.
- **Images tab** — browse local Docker images, delete individual or multiple images at once.
- **Volumes tab** — browse local Docker volumes, delete individual or multiple volumes at once.
- Displays the `docker exec -it <name> sh` command for TTY-enabled containers so you can attach a shell from your own terminal.
- Container stdout/stderr logs with refresh and copy-to-clipboard.

---

## Current architecture

- Backend: Node.js, Express, TypeScript.
- Database access: native drivers, not an ORM.
- Frontend: React + Vite + TypeScript.
- Icons: custom stroke-based SVG icon set (`Icons.tsx`) — no emoji, no third-party icon library.
- Packaging: CLI entry point plus compiled browser assets bundled into the npm package.

---

## Supported databases

| Protocol                         | Database        | Example                                           |
| -------------------------------- | --------------- | ------------------------------------------------- |
| `postgres://`, `postgresql://`   | PostgreSQL      | `postgres://user:pass@localhost:5432/app`         |
| `cockroachdb://`, `cockroach://` | CockroachDB     | `cockroachdb://root@localhost:26257/defaultdb`    |
| `mongodb://`, `mongodb+srv://`   | MongoDB         | `mongodb://localhost:27017/app`                   |
| `mysql://`, `mariadb://`         | MySQL / MariaDB | `mysql://root:pass@localhost:3306/app`            |
| `sqlite:`                        | SQLite          | `sqlite:./data/app.sqlite`                        |
| `mssql://`, `sqlserver://`       | SQL Server      | `mssql://sa:pass@localhost:1433/master`           |
| `redis://`, `rediss://`          | Redis           | `redis://localhost:6379`                          |

---

## Main features

### Multi-database fleet dashboard

- Shown automatically when two or more connections are configured.
- Summary bar with total databases, objects, and records across all connections.
- Health-card grid — one card per database with online status, object count, and record count.
- Cross-database size comparison bar chart (clickable — jumps to that database).
- Database-type distribution donut chart with legend.
- Quick-actions panel — select any connected database to open its query console, schema visualizer, or jump straight to a table.

### Overview dashboard (per database)

- Total tables / collections and record counts.
- Data distribution donut for the active database.
- Top object bars and explanatory insights.
- Click-through navigation into a selected table or collection.

### Data explorer

- Table view for rows and columns with **pagination** (configurable page size).
- **Draggable column resizing** — drag the resize handle on any column header to widen or narrow it.
- **Per-column inline filters** — type in a filter row below the headers and press Enter to filter.
- **Row-range indicator** — shows the current page number and exact row range (e.g. Rows 1–100).
- **Export CSV** — download the currently loaded result set as a `.csv` file.
- **Sensitive column masking** — columns named `password`, `token`, or `secret` are hidden behind `*****` with a toggle to reveal.
- **Skeleton loaders** while table data is fetching.
- **Row count badge** next to each table name in the sidebar.
- Document cards for record inspection.
- JSON view for raw payloads.
- Inspector view for field-by-field analysis.
- Sidebar object filtering and database switching.
- **Friendly error UI with Retry button** when an API call fails.

### Schema visualizer

- Auto-generated graph from relational metadata.
- Foreign-key edges and column summaries.
- Table inspector with columns and relationships.

### Query workspace

- SQL query mode for relational drivers.
- MongoDB structured query mode with filter, projection, sort, and limit.
- Mongo aggregation pipeline mode with example pipelines.
- **Query bookmarks** — save and recall frequent queries from local storage.
- Recent query history stored in local storage.
- **Execution time badge** displayed after every query run.
- **Ctrl + Enter** keyboard shortcut to run a query without leaving the keyboard.
- **Copy-to-clipboard** button for query results.
- Result rendering as table or JSON.

### Docker container manager

- Live container list with running / stopped grouping.
- Per-container CPU %, memory usage, port bindings, and health status.
- Container action buttons: start, stop, restart, delete.
- **Bulk actions**: toggle Select mode → check containers → Stop selected or Delete selected.
- Container logs with auto-scroll, refresh, and clipboard copy.
- TTY shell access command shown inline for interactive containers.

### Container launcher

- Search Docker Hub images with live dropdown results.
- Select version tag from the fetched tag list.
- Configure port bindings (host:container, TCP/UDP).
- Configure volume mounts (host path → container path).
- Configure environment variables (key=value).
- Set a custom startup command to override the image entrypoint.
- Enable TTY / interactive mode (`-it`) for shell-based images such as ubuntu or busybox.
- Auto-populates defaults for known images (Redis, PostgreSQL, MySQL, MongoDB, MariaDB, RabbitMQ, Elasticsearch, Memcached, Nginx).
- Multi-container batch launch with a real-time execution log.
- Generate and download a `docker-compose.yml` for the current configuration.

### Local images browser

- Lists all locally downloaded Docker images.
- Shows short image ID, repository tags, size, and creation date.
- Delete individual images.
- **Bulk delete** — select any number of images and delete them all with one click.
- Search / filter by tag or ID.

### Local volumes browser

- Lists all local Docker volumes.
- Shows volume name, driver, scope, and mountpoint path.
- Delete individual volumes.
- **Bulk delete** — select any number of volumes and delete them all with one click.
- Search / filter by name or driver.

---

## Read-only behavior (database mode)

This build is intentionally read-only for database connections.

- Write endpoints were removed from the backend.
- Mutating SQL statements are blocked at the server.
- MongoDB `$out` and `$merge` pipeline stages are blocked.
- Inline edit and update behavior was removed from the table UI.

Use read-only database credentials if you want an additional database-level safety layer.

---

## Security

- **Rate limiting** — all `/api/` routes are protected with a 100-requests-per-minute rate limiter (`express-rate-limit`). This prevents brute-force or accidental runaway polling.
- **ReDoS protection** — block-comment stripping in the SQL read-only checker uses a safe pattern to prevent regex denial-of-service.
- **Dependency auditing** — known vulnerabilities in `brace-expansion`, `qs`, `uuid`, and transitive frontend dependencies are patched. Run `npm audit` for the current status.
- **Read-only SQL enforcement** — only `SELECT`, `WITH`, `SHOW`, `DESCRIBE`, `EXPLAIN`, and `PRAGMA` statements are permitted. All mutating keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.) are blocked even when nested inside CTEs.

---

## Environment variables

Create a `.env` file in the project root (database mode only).

```bash
DATABASE_URL=postgres://user:password@localhost:5432/my_db
DATABASE_URL_1=mongodb://localhost:27017/logs
DATABASE_URL_2=sqlite:./local.db
PORT=3000
```

Only `DATABASE_URL` is required. Additional numbered URLs are optional.

Docker mode does not require any environment variables.

---

## 📸 Application Screenshots

<div align="center">

### Overview Dashboard — Summary Analytics

![Overview Dashboard](assets/overview_1.png)

---

### Overview Dashboard — Database Insights

![Overview Insights](assets/overview_2.png)

---

### Schema Visualiser

![Schema Visualiser](assets/schema-visualiser.png)

---

### Table View

![Table View](assets/table_view.png)

---

### Card View

![Card View](assets/card_view.png)

---

### Inspector View

![Inspector View](assets/inspector_view.png)

</div>

---

## Installation

### Use with npx (no install needed)

The fastest way — no installation required:

```bash
# Database mode
npx dbportal

# Docker mode
npx dbportal --docker
```

With specific host or port:

```bash
npx dbportal --host 127.0.0.1 --port 4000
npx dbportal --docker --port 5656
```

### Install as a dev dependency (recommended)

Add dbportal to your project so your whole team gets the same version:

```bash
npm install --save-dev dbportal
```

Then add a script to your `package.json`:

```json
{
  "scripts": {
    "db": "dbportal",
    "db:docker": "dbportal --docker"
  }
}
```

Run it with:

```bash
npm run db
npm run db:docker
```

### Develop from this repository

```bash
npm install
npm run dev
npm run dev:ui
npm run build
```

---

## CLI flags

| Flag | Description | Default |
|------|-------------|---------|
| `--docker` | Start in Docker mode (connects to local daemon) | off |
| `--port <n>` | Port to listen on | 3000 |
| `--host <addr>` | Host/address to bind | `127.0.0.1` |

---

## Docker mode API endpoints

In addition to the standard database API routes, Docker mode exposes:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/docker/containers` | List all containers |
| `GET` | `/api/docker/containers/:id/stats` | Live CPU / memory stats |
| `GET` | `/api/docker/containers/:id/inspect` | Full container inspect |
| `GET` | `/api/docker/containers/:id/logs` | Container stdout/stderr |
| `POST` | `/api/docker/containers/:id/action` | `{ action: "start"\|"stop"\|"restart"\|"delete" }` |
| `POST` | `/api/docker/containers/bulk-action` | `{ ids: string[], action: "stop"\|"delete" }` |
| `GET` | `/api/docker/images` | List local images |
| `DELETE` | `/api/docker/images/:id` | Delete a single image |
| `POST` | `/api/docker/images/bulk-delete` | `{ ids: string[] }` |
| `GET` | `/api/docker/volumes` | List local volumes |
| `DELETE` | `/api/docker/volumes/:name` | Delete a single volume |
| `POST` | `/api/docker/volumes/bulk-delete` | `{ names: string[] }` |
| `GET` | `/api/docker/hub/search?query=` | Search Docker Hub |
| `GET` | `/api/docker/hub/tags?repo=` | Fetch image tags |
| `POST` | `/api/docker/hub/run` | Pull + run a batch of containers (SSE stream) |
| `POST` | `/api/docker/hub/save-compose` | Save generated compose YAML to disk |

---

## Standard API endpoints (database mode)

- `GET /api/connections`
- `GET /api/tables?dbId=...`
- `GET /api/capabilities?dbId=...`
- `GET /api/overview?dbId=...`
- `GET /api/schema?dbId=...`
- `GET /api/data/:name?dbId=...&limit=...`
- `POST /api/query?dbId=...`

---

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

---

## Troubleshooting

### Port already in use

**Error**

```bash
Error: Unable to find an available port between 3000 and 3024
```

**Fix**

Set a custom port in your `.env` file:

```env
PORT=4000
```

Or pass a port directly with the CLI:

```bash
npx dbportal --port 4000
```

### Docker daemon not running

**Error**

```bash
connect ENOENT /var/run/docker.sock
```

**Fix**

Make sure Docker Desktop (or Docker Engine) is running before starting dbportal in Docker mode. On Windows, start Docker Desktop from the system tray.

### Ubuntu / Busybox containers exit immediately

These images run an interactive shell (`/bin/bash` or `sh`) as their entrypoint. Without a TTY, the shell receives EOF immediately and exits with code 0.

**Fix**

When launching them through the Container Launcher, enable the **TTY / Interactive** toggle. This sets `Tty: true` and `OpenStdin: true`. Alternatively, set a persistent command such as `sleep infinity` or `tail -f /dev/null` in the **Command** field.

### PostgreSQL SSL certificate errors

**Error**

```bash
self-signed certificate in certificate chain
```

**Fix**

Append one of the following to your `DATABASE_URL`:

```env
?sslmode=disable
```

or

```env
?sslmode=require
```

Example:

```env
DATABASE_URL=postgres://user:password@localhost:5432/my_db?sslmode=require
```

### MongoDB SRV resolution failing

**Error**

```bash
querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net
```

**Fix**

This is usually caused by DNS resolution issues.

- Check your internet connection and DNS settings
- VPNs or corporate proxies may block SRV resolution
- Try using a direct `mongodb://` connection string instead of `mongodb+srv://`

Example:

```env
mongodb://localhost:27017/my_db
```

### SQLite file path issues on Windows

**Error**

```bash
SQLITE_CANTOPEN: unable to open database file
```

**Fix**

Use forward slashes or double backslashes in SQLite paths.

Examples:

```env
sqlite:./data/app.sqlite
```

```env
sqlite:C:/Users/you/app.sqlite
```

### No DATABASE_URL found

**Error**

```bash
No DATABASE_URL found in .env. Please provide at least one connection string.
```

**Fix**

Make sure your `.env` file exists in the same directory where you run:

```bash
npx dbportal
```

The CLI reads `.env` from the current working directory. This error does not appear in Docker mode.

---

## Publishing notes

- The package ships the compiled backend in `dist/` and the built frontend in `frontend/dist/`.
- npm publish currently requires an account token or 2FA OTP on your account.
- The package name is `dbportal` and the current version is `1.0.4`.

---

## Repository layout

- `src/` backend source
  - `cli.ts` Express routes for both modes
  - `docker-service.ts` Docker daemon adapter
  - `drivers/` database-specific driver implementations
- `frontend/src/` React UI source
  - `components/Icons.tsx` shared SVG icon set
  - `components/DockerSidebar.tsx` Docker mode navigation + bulk select
  - `components/views/DockerDashboardView.tsx` container metrics + logs
  - `components/views/DockerRunnerView.tsx` container launcher
  - `components/views/DockerImagesView.tsx` local images browser
  - `components/views/DockerVolumesView.tsx` local volumes browser
- `bin/cli.js` executable launcher
- `dist/` compiled package artifacts

---

## 💬 Community

Want to discuss features, get help, or connect with other contributors? Join our Discord server to chat with the maintainers and community:

👉 **[Join the dbportal Discord Server](https://discord.gg/YnRq6df2RY)**

## Contributors

<a href="https://github.com/Mananwebdev160408/dbportal/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Mananwebdev160408/dbportal" />
</a>

## License

MIT © Manan Gupta
