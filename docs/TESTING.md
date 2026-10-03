# Testing

The backend has **automated tests** (Vitest + Supertest) and **manual API request files** for the VS Code REST Client and Postman.

## Contents

- [Run the automated tests](#run-the-automated-tests)
- [Test structure](#test-structure)
- [What is tested](#what-is-tested)
- [REST Client file](#rest-client-file-serverrequestshttp)
- [Postman collection](#postman-collection)

---

## Run the automated tests

From the `server/` folder:

```bash
npm test
```

| Command | Purpose |
|---|---|
| `npm test` | Run all tests once |
| `npm run test:watch` | Re-run tests on every file save |
| `npm run test:coverage` | Run tests + coverage report (terminal + HTML in `server/coverage/index.html`) |

No server or database setup is needed: every test creates its own **in-memory SQLite database** and calls the Express app through Supertest **without opening a port**.

Current result: **99 tests, all passing; ~97% line coverage.**

The frontend has its own unit tests (37) for its pure logic: due-date maths, URL/id parsing, change detection and list options (`client/src/lib/*.test.ts`), run with `npm test` inside `client/`. From the **root**, `npm test` runs both suites (136 tests).

## Test structure

```
server/tests/
├── helpers.ts                      # createTestRepository / createTestService / createTestApp
├── unit/
│   ├── todo.repository.test.ts     # SQL layer against a real in-memory SQLite
│   ├── todo.schemas.test.ts        # validation rules, table-driven (it.each)
│   └── todo.service.test.ts        # business logic: defaults, 400 vs 404, stats
└── api/
    ├── todos.api.test.ts           # every endpoint over HTTP: status codes, bodies, headers
    └── app-options.test.ts         # static frontend serving, request logging, file DB
```

| Level | What it proves | Speed |
|---|---|---|
| **Unit** (repository, schemas, service) | Each layer does its job in isolation | Very fast |
| **API / integration** (Supertest) | The layers work together and the HTTP contract (status codes, JSON shapes, headers) is correct | Fast (no network, in-memory DB) |

### Design choices

- **Fresh in-memory DB per test** (`beforeEach`): tests never share state, so they pass in any order and can't affect each other.
- **Real SQLite instead of mocks:** an in-memory database is as fast as a mock, and it tests the actual SQL (sorting, `LIKE` escaping, `CHECK` constraints). A mocked repository would only test that the mock was called.
- **Table-driven tests** (`it.each`): one test body, many inputs. Every edge case (`"0"`, `"-1"`, `"1.5"`, `"1e3"`, `"01"`, …) is listed explicitly and shows up as its own test in the report.
- **Fake timers** (`vi.useFakeTimers` + `vi.setSystemTime`) to check that `updatedAt` changes on update while `createdAt` does not, without waiting for real time to pass.
- **Explicit imports** (`import { describe, it, expect } from "vitest"`) instead of global test functions: no hidden magic, and TypeScript knows every type.

## What is tested

**Repository**
- Create returns the API shape (`completed` as boolean, ISO timestamps)
- AUTOINCREMENT: ids of deleted todos are never reused
- DB `CHECK` constraints reject blank titles and impossible dates even if validation is bypassed
- Default order newest first with `id` tie-breaker; filters by status
- Case-insensitive search in title and description; `%` and `_` matched literally
- Sorting: priority by importance, due date with "no date" last in both directions, title ignoring case
- Partial update keeps other fields, `dueDate: null` clears the date, `updatedAt` refreshed, `createdAt` kept
- Delete / delete-completed counts / stats

**Validation schemas**
- `id`: accepts `1`, `42`; rejects `0`, `-1`, `abc`, `1.5`, `1e3`, `01`, empty, spaces
- Create: defaults + trimming; 200-char title OK, 201 rejected; leap years (`2028-02-29` OK, `2026-02-29` rejected); unknown and client-controlled fields rejected
- Update: no defaults added; `null` due date allowed; empty object rejected; `"true"` / `1` not accepted as booleans
- List query: defaults, blank search ignored, unknown params ignored, SQL-looking `sortBy` and repeated params rejected

**Service**
- Defaults applied; all validation problems reported at once with field names
- Non-object bodies (`undefined`, `null`, `[]`, text) rejected with one clear message
- 400 for a bad id vs 404 for a missing todo; body validated *before* the existence check
- `list` returns stats for all todos regardless of the filter

**API (HTTP)**
- Every endpoint: success status, response body, `Location` header on create, empty body on `204`
- `400 VALIDATION_ERROR`, `400 INVALID_JSON`, missing body, `413 PAYLOAD_TOO_LARGE`
- `404 NOT_FOUND`, JSON `404 ROUTE_NOT_FOUND` for unknown routes and `PUT`
- `DELETE /api/todos/completed` is not mistaken for an id
- Unexpected errors → generic `500` with no internal details leaked (simulated by closing the DB)
- `X-Powered-By` header hidden
- Built frontend served as static files; request logging; file DB created in missing folders and data kept after reopening

---

## REST Client file: `server/requests.http`

For the VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension.

1. Install the extension.
2. Start the server: `cd server && npm run dev`.
3. Open `server/requests.http` and click **Send Request** above any request.

Run **"Create a todo"** first: its response id is captured into `{{todoId}}` and reused by the get / update / delete requests. The file also contains every error case (validation, malformed JSON, invalid id, unknown id, invalid query, unknown route).

## Postman collection

File: `server/postman/ziptrrip-todos.postman_collection.json` (Postman collection format v2.1).

1. Start the server: `cd server && npm run dev`.
2. In Postman: **Import** → select the file.
3. Run requests one by one, or open the collection → **Run** to execute all of them with their tests.

| Folder | Requests |
|---|---|
| 1. Health | Health check |
| 2. Todos CRUD | Create, create with defaults, list, filter + sort, search, get, edit, complete, delete, get deleted (404), clear completed |
| 3. Error cases | Validation errors, malformed JSON, empty update, invalid id, unknown id, invalid query, unknown route |

- Collection variables: `baseUrl` (`http://localhost:3000/api`) and `todoId` (set automatically by "Create a todo").
- **Every request has test assertions** (status code, error code, response content): 19 requests, 39 assertions.

Run the collection from the command line with [newman](https://www.npmjs.com/package/newman) (Postman's CLI runner), while the server is running:

```bash
npx newman run postman/ziptrrip-todos.postman_collection.json
```
