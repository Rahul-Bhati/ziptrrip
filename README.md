# Ziptrrip Todo App

A full-stack todo application built for the Ziptrrip tech assignment.

- **Backend:** Node.js + Express 5 + TypeScript, REST CRUD API, SQLite database
- **Frontend:** React + Vite as a **Multi-Page Application (MPA)**: a todo list page and a single-todo page (`todo.html?id=<id>`)

> 🚧 **Status: in progress.** The server skeleton and database layer are done.
> See [docs/BUILD_LOG.md](docs/BUILD_LOG.md) for a step-by-step record of what was built and why.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Data model](#data-model)
- [API](#api)
- [Documentation](#documentation)
- [Assignment checklist](#assignment-checklist)

---

## Features

| Feature | Status |
|---|---|
| SQLite persistence (data survives restarts) | ✅ Done (database layer) |
| Todo fields: title, description, priority, due date, completed, timestamps | ✅ Done (database layer) |
| Filter by status (all / active / completed) | ✅ Done (database layer) |
| Case-insensitive search in title and description | ✅ Done (database layer) |
| Sort by created date, due date, priority or title (asc / desc) | ✅ Done (database layer) |
| Clear all completed todos | ✅ Done (database layer) |
| Counts (total / active / completed) | ✅ Done (database layer) |
| Request validation with clear error messages | ⏳ Planned (step 3) |
| REST CRUD API | ⏳ Planned (step 4) |
| Unit + API tests | ⏳ Planned (step 5) |
| REST Client (`.http`) + Postman collection | ⏳ Planned (step 5) |
| Todo list page | ⏳ Planned (step 6) |
| Single todo page (`todo.html?id=<id>`) | ⏳ Planned (step 7) |

> "Done (database layer)" means the logic exists and is verified in the repository layer, but is not yet reachable over HTTP. That comes in step 4.

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
├── README.md                    # this file
├── docs/
│   └── BUILD_LOG.md             # step-by-step build decisions
└── server/                      # backend (Express + TypeScript)
    ├── package.json
    ├── tsconfig.json            # type-checking config (src + tests)
    ├── tsconfig.build.json      # build config (src only → dist/)
    └── src/
        ├── index.ts             # entry point: starts the HTTP server
        ├── app.ts               # createApp(): builds the Express app
        ├── types/
        │   └── todo.ts          # Todo type + allowed values (priorities, sort fields…)
        ├── db/
        │   ├── schema.ts        # CREATE TABLE statement
        │   └── database.ts      # opens SQLite, applies schema
        └── repositories/
            └── todo.repository.ts   # all SQL queries live here
```

Planned: `server/src/services`, `controllers`, `routes`, `middleware`, `server/tests`, and a `client/` folder for the frontend.

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
To use another port, set the `PORT` environment variable (e.g. `PORT=4000 npm run dev`; in PowerShell: `$env:PORT=4000; npm run dev`).

### 4. Check that it works

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok" }
```

### Production build

```bash
npm run build
npm start
```

`build` compiles TypeScript into `server/dist/`, and `start` runs the compiled JavaScript with plain Node.

## Available scripts

Run these inside the `server/` folder:

| Command | What it does |
|---|---|
| `npm run dev` | Start the server with auto-restart on file changes |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Check types without building |
| `npm test` | Run tests (tests are added in step 5) |

## Data model

Table `todos` (SQLite):

| Field (API) | Column (DB) | Type | Notes |
|---|---|---|---|
| `id` | `id` | integer | Auto-increment; never reused after a delete |
| `title` | `title` | text | Required, cannot be blank |
| `description` | `description` | text | Defaults to empty string |
| `completed` | `completed` | boolean (stored as 0/1) | Defaults to `false` |
| `priority` | `priority` | `"low"` \| `"medium"` \| `"high"` | Defaults to `"medium"` |
| `dueDate` | `due_date` | `"YYYY-MM-DD"` or `null` | Must be a real calendar date |
| `createdAt` | `created_at` | ISO 8601 timestamp | Set on create |
| `updatedAt` | `updated_at` | ISO 8601 timestamp | Updated on every change |

## API

Currently available:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check → `{ "status": "ok" }` |

The todo CRUD endpoints (`GET/POST /api/todos`, `GET/PATCH/DELETE /api/todos/:id`) are planned for step 4 and will be documented here and in `docs/API.md`.

## Documentation

| Document | Contents |
|---|---|
| [docs/BUILD_LOG.md](docs/BUILD_LOG.md) | What was built in each step, why, and which alternatives were rejected |

## Assignment checklist

| Requirement | Where | Status |
|---|---|---|
| JavaScript / TypeScript server | `server/` | ✅ |
| Save data in a file or database | SQLite (`server/src/db`) | ✅ |
| CRUD APIs for todos | — | ⏳ Step 4 |
| Unit tests | — | ⏳ Step 5 |
| Postman / REST Client files | — | ⏳ Step 5 |
| React app as an MPA | — | ⏳ Step 6 |
| Todo list page | — | ⏳ Step 6 |
| Single todo page with id query parameter | — | ⏳ Step 7 |
| Features documented in `.md` files | `README.md`, `docs/` | 🚧 Updated every step |
| Extra: TypeScript | Whole project | ✅ |
| Extra: Database | SQLite | ✅ |
| Extra: Code organisation | Layered: types / db / repositories (more layers coming) | 🚧 |
