# Ziptrrip Todo App

A full-stack todo application built for the Ziptrrip tech assignment.

- **Backend:** Node.js + Express 5 + TypeScript, REST CRUD API, SQLite database
- **Frontend:** React + Vite as a **Multi-Page Application (MPA)**: a todo list page and a single-todo page (`todo.html?id=<id>`)

> 🚧 **Status: in progress.** The backend REST API is complete. Tests, API client files and the frontend are next.
> See [docs/BUILD_LOG.md](docs/BUILD_LOG.md) for a step-by-step record of what was built and why.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Available scripts](#available-scripts)
- [API overview](#api-overview)
- [Data model](#data-model)
- [Documentation](#documentation)
- [Assignment checklist](#assignment-checklist)

---

## Features

| Feature | Status |
|---|---|
| REST CRUD API for todos | ✅ Done |
| SQLite persistence (data survives restarts) | ✅ Done |
| Todo fields: title, description, priority, due date, completed, timestamps | ✅ Done |
| Filter by status (all / active / completed) | ✅ Done (API) |
| Case-insensitive search in title and description | ✅ Done (API) |
| Sort by created date, due date, priority or title (asc / desc) | ✅ Done (API) |
| Clear all completed todos | ✅ Done (API) |
| Counts (total / active / completed) returned with the list | ✅ Done (API) |
| Validation with per-field error messages, consistent JSON errors | ✅ Done |
| Request logging, graceful shutdown | ✅ Done |
| Unit + API tests | ⏳ Planned (step 5) |
| REST Client (`.http`) + Postman collection | ⏳ Planned (step 5) |
| Todo list page | ⏳ Planned (step 6) |
| Single todo page (`todo.html?id=<id>`) | ⏳ Planned (step 7) |

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript | Type safety across the whole project |
| Server | Express 5 | Well-known, minimal; v5 handles errors from `async` handlers |
| Database | SQLite (`better-sqlite3`) | Real SQL database in a single file: no DB server to install |
| Validation | Zod | Runtime validation + TypeScript types from one schema |
| Frontend | React + Vite (multi-page) | Each page is its own HTML file → real MPA |
| Testing | Vitest + Supertest | Fast, native TypeScript/ESM support |

Detailed reasoning and rejected alternatives: [docs/BUILD_LOG.md](docs/BUILD_LOG.md#overall-stack-decisions).

## Project structure

```
ziptrrip/
├── README.md                     # this file
├── docs/
│   ├── API.md                    # full API reference
│   └── BUILD_LOG.md              # step-by-step build decisions
└── server/                       # backend (Express + TypeScript)
    ├── package.json
    ├── tsconfig.json             # type-checking config (src + tests)
    ├── tsconfig.build.json       # build config (src only → dist/)
    ├── data/                     # SQLite database file (created on first run, not committed)
    └── src/
        ├── index.ts              # entry point: open DB, start server, graceful shutdown
        ├── app.ts                # createApp(db): wires all layers together
        ├── config.ts             # PORT, DB_PATH, CLIENT_DIST_PATH
        ├── errors.ts             # AppError, NotFoundError (404), ValidationError (400)
        ├── types/todo.ts         # Todo type + allowed values
        ├── routes/               # URL → controller mapping
        ├── controllers/          # HTTP in/out: status codes, response shape
        ├── services/             # business logic: validate → repository → errors
        ├── validation/           # Zod schemas + parse() helper
        ├── repositories/         # all SQL queries live here
        ├── db/                   # SQLite connection + schema
        └── middleware/           # error handler, 404 handler, request logger
```

Request flow:

```
HTTP request → route → controller → service (validates) → repository (SQL) → SQLite
                                        └── errors → error middleware → JSON error response
```

Planned: `server/tests`, API client files, and a `client/` folder for the frontend.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) **20 or newer** (developed on Node 22 LTS)
- npm (comes with Node)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Rahul-Bhati/ziptrrip.git
cd ziptrrip
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Run the server in development mode

```bash
npm run dev
```

The server starts on **http://localhost:3000** and restarts automatically when you save a file.
On first run it creates the database at `server/data/todos.db`.

### 4. Try the API

```bash
curl http://localhost:3000/api/health
```

```bash
curl -X POST http://localhost:3000/api/todos -H "Content-Type: application/json" -d "{\"title\":\"Buy milk\",\"priority\":\"high\"}"
```

```bash
curl "http://localhost:3000/api/todos?status=active&sortBy=priority"
```

### Production build

```bash
npm run build
npm start
```

`build` compiles TypeScript into `server/dist/`, and `start` runs the compiled JavaScript with plain Node.

## Configuration

All settings are optional environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `server/data/todos.db` | SQLite database file |
| `CLIENT_DIST_PATH` | `client/dist` | Built frontend served by the server in production |

Example: `PORT=4000 npm run dev` (PowerShell: `$env:PORT=4000; npm run dev`).

## Available scripts

Run these inside the `server/` folder:

| Command | What it does |
|---|---|
| `npm run dev` | Start the server with auto-restart on file changes |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Check types without building |
| `npm test` | Run tests (tests are added in step 5) |

## API overview

| Method | Endpoint | Description | Success |
|---|---|---|---|
| `GET` | `/api/health` | Health check | `200` |
| `GET` | `/api/todos?status=&search=&sortBy=&order=` | List todos + counts | `200` |
| `GET` | `/api/todos/:id` | Get one todo | `200` |
| `POST` | `/api/todos` | Create a todo | `201` |
| `PATCH` | `/api/todos/:id` | Update some fields | `200` |
| `DELETE` | `/api/todos/:id` | Delete a todo | `204` |
| `DELETE` | `/api/todos/completed` | Delete all completed todos | `200` |

Success responses: `{ "data": ... }`. Errors: `{ "error": { "code", "message", "details?" } }`.

Full reference with examples, validation rules and error codes: **[docs/API.md](docs/API.md)**.

## Data model

Table `todos` (SQLite):

| Field (API) | Column (DB) | Type | Notes |
|---|---|---|---|
| `id` | `id` | integer | Auto-increment; never reused after a delete |
| `title` | `title` | text | Required, 1–200 characters |
| `description` | `description` | text | Max 2000 characters, defaults to `""` |
| `completed` | `completed` | boolean (stored as 0/1) | Defaults to `false` |
| `priority` | `priority` | `"low"` \| `"medium"` \| `"high"` | Defaults to `"medium"` |
| `dueDate` | `due_date` | `"YYYY-MM-DD"` or `null` | Must be a real calendar date |
| `createdAt` | `created_at` | ISO 8601 timestamp | Set on create |
| `updatedAt` | `updated_at` | ISO 8601 timestamp | Updated on every change |

## Documentation

| Document | Contents |
|---|---|
| [docs/API.md](docs/API.md) | Every endpoint: parameters, examples, status codes, errors |
| [docs/BUILD_LOG.md](docs/BUILD_LOG.md) | What was built in each step, why, and which alternatives were rejected |

## Assignment checklist

| Requirement | Where | Status |
|---|---|---|
| JavaScript / TypeScript server | `server/` | ✅ |
| CRUD APIs for todos | `server/src/routes`, [docs/API.md](docs/API.md) | ✅ |
| Save data in a file or database | SQLite (`server/src/db`) | ✅ |
| Unit tests | — | ⏳ Step 5 |
| Postman / REST Client files | — | ⏳ Step 5 |
| React app as an MPA | — | ⏳ Step 6 |
| Todo list page | — | ⏳ Step 6 |
| Single todo page with id query parameter | — | ⏳ Step 7 |
| Features documented in `.md` files | `README.md`, `docs/` | 🚧 Updated every step |
| Extra: TypeScript | Whole project | ✅ |
| Extra: Database | SQLite | ✅ |
| Extra: Code organisation | Layered: routes / controllers / services / repositories | ✅ |
