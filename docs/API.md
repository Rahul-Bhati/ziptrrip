# API Reference

Base URL (development): `http://localhost:3000`

All request and response bodies are JSON. Send `Content-Type: application/json` with every request that has a body.

## Contents

- [Response format](#response-format)
- [Todo object](#todo-object)
- [Endpoints](#endpoints)
  - [Health check](#health-check)
  - [List todos](#list-todos)
  - [Get one todo](#get-one-todo)
  - [Create a todo](#create-a-todo)
  - [Update a todo](#update-a-todo)
  - [Delete a todo](#delete-a-todo)
  - [Delete all completed todos](#delete-all-completed-todos)
- [Errors](#errors)
- [Validation rules](#validation-rules)

---

## Response format

**Success:** the payload is always under `data`:

```json
{ "data": { "id": 1, "title": "Buy milk" } }
```

**Error:** always under `error`, with a stable `code`, a readable `message`, and (for validation errors) per-field `details`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "title", "message": "title is required" }]
  }
}
```

One shape for success and one for errors means a client needs only one piece of code to handle every response.

## Todo object

| Field | Type | Description |
|---|---|---|
| `id` | integer | Unique, auto-generated, never reused |
| `title` | string | 1–200 characters (trimmed) |
| `description` | string | 0–2000 characters (trimmed), `""` if not set |
| `completed` | boolean | `false` when created |
| `priority` | `"low"` \| `"medium"` \| `"high"` | `"medium"` if not set |
| `dueDate` | string \| null | Calendar date `YYYY-MM-DD`, or `null` for no due date |
| `createdAt` | string | ISO 8601 UTC timestamp, set on create |
| `updatedAt` | string | ISO 8601 UTC timestamp, updated on every change |

```json
{
  "id": 1,
  "title": "Buy milk",
  "description": "2 litres, full cream",
  "completed": false,
  "priority": "high",
  "dueDate": "2026-10-10",
  "createdAt": "2026-10-03T08:23:28.207Z",
  "updatedAt": "2026-10-03T08:23:28.207Z"
}
```

---

## Endpoints

| Method | Path | Description | Success |
|---|---|---|---|
| `GET` | `/api/health` | Health check | `200` |
| `GET` | `/api/todos` | List todos (filter, search, sort) + counts | `200` |
| `GET` | `/api/todos/:id` | Get one todo | `200` |
| `POST` | `/api/todos` | Create a todo | `201` |
| `PATCH` | `/api/todos/:id` | Update some fields of a todo | `200` |
| `DELETE` | `/api/todos/:id` | Delete a todo | `204` |
| `DELETE` | `/api/todos/completed` | Delete all completed todos | `200` |

### Health check

`GET /api/health`

```json
{ "status": "ok" }
```

### List todos

`GET /api/todos`

| Query param | Values | Default | Description |
|---|---|---|---|
| `status` | `all`, `active`, `completed` | `all` | Filter by completion |
| `search` | text (max 200 chars) | none | Case-insensitive match in title **or** description. Empty = no search |
| `sortBy` | `createdAt`, `dueDate`, `priority`, `title` | `createdAt` | Sort field |
| `order` | `asc`, `desc` | `desc` | Sort direction |

Sorting notes:
- `priority` sorts by importance (low < medium < high), not alphabetically.
- With `sortBy=dueDate`, todos without a due date are always listed **last**, in both directions.
- `title` sorting ignores upper/lower case.

`stats` always counts **all** todos, regardless of the filter, so a UI can show totals next to the filtered list.

Example: `GET /api/todos?status=active&sortBy=priority&order=desc&search=milk`

```json
{
  "data": [
    {
      "id": 1,
      "title": "Buy milk",
      "description": "",
      "completed": false,
      "priority": "high",
      "dueDate": "2026-10-10",
      "createdAt": "2026-10-03T08:23:28.207Z",
      "updatedAt": "2026-10-03T08:23:28.207Z"
    }
  ],
  "stats": { "total": 5, "active": 3, "completed": 2 }
}
```

Errors: `400` for an invalid `status` / `sortBy` / `order`, a too-long `search`, or a repeated param (`?status=a&status=b`).

### Get one todo

`GET /api/todos/:id`

```json
{ "data": { "id": 1, "title": "Buy milk", "...": "..." } }
```

Errors: `400` if `id` is not a positive integer (`abc`, `0`, `-1`, `1.5`); `404` if no todo has this id.

### Create a todo

`POST /api/todos`

| Field | Required | Type | Default |
|---|---|---|---|
| `title` | **yes** | string, 1–200 chars | — |
| `description` | no | string, max 2000 chars | `""` |
| `priority` | no | `low` / `medium` / `high` | `medium` |
| `dueDate` | no | `YYYY-MM-DD` or `null` | `null` |

`id`, `completed`, `createdAt` and `updatedAt` are set by the server. Sending them (or any unknown field) is a `400`, so typos like `titel` are caught instead of silently ignored.

Request:

```json
{ "title": "Buy milk", "priority": "high", "dueDate": "2026-10-10" }
```

Response `201 Created`, with header `Location: /api/todos/1`:

```json
{ "data": { "id": 1, "title": "Buy milk", "completed": false, "priority": "high", "...": "..." } }
```

### Update a todo

`PATCH /api/todos/:id`

Send **only the fields you want to change** (at least one). Fields not sent stay as they are.

| Field | Type |
|---|---|
| `title` | string, 1–200 chars |
| `description` | string, max 2000 chars |
| `priority` | `low` / `medium` / `high` |
| `dueDate` | `YYYY-MM-DD`, or **`null` to remove the due date** |
| `completed` | boolean |

Examples:

```json
{ "completed": true }
```

```json
{ "title": "Buy oat milk", "dueDate": null }
```

Response `200` with the full updated todo; `updatedAt` is refreshed.

Errors: `400` for an invalid id, an empty body `{}`, an invalid field, or an unknown field; `404` if the todo does not exist.

> **Why PATCH and not PUT?** PUT means "replace the whole resource", so the client would have to send every field just to tick a checkbox. PATCH sends only what changed. `PUT` is not supported and returns `404 ROUTE_NOT_FOUND`.

### Delete a todo

`DELETE /api/todos/:id`

Response `204 No Content` (empty body).

Errors: `400` for an invalid id; `404` if the todo does not exist (including a second delete of the same id).

### Delete all completed todos

`DELETE /api/todos/completed`

```json
{ "data": { "deleted": 2 } }
```

Returns `200` with the count (also when it is `0`).

---

## Errors

| Status | `code` | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid id, body or query param. `details` lists every problem at once |
| `400` | `INVALID_JSON` | Body is not valid JSON |
| `404` | `NOT_FOUND` | No todo with this id |
| `404` | `ROUTE_NOT_FOUND` | No such endpoint / method |
| `413` | `PAYLOAD_TOO_LARGE` | Body larger than 100 KB |
| `500` | `INTERNAL_ERROR` | Unexpected server error (details are logged on the server, never sent to the client) |

Example: several problems in one request.

```http
POST /api/todos
{ "title": "", "priority": "urgent", "dueDate": "2026-02-30", "extra": 1 }
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "title", "message": "title cannot be empty" },
      { "field": "priority", "message": "priority must be one of: low, medium, high" },
      { "field": "dueDate", "message": "dueDate must be a valid date in YYYY-MM-DD format, or null" },
      { "message": "Unrecognized key: \"extra\"" }
    ]
  }
}
```

## Validation rules

| Input | Rule |
|---|---|
| `id` (path) | Digits only, no leading zero, greater than 0 |
| `title` | String, trimmed, 1–200 characters |
| `description` | String, trimmed, max 2000 characters |
| `priority` | One of `low`, `medium`, `high` |
| `dueDate` | Real calendar date `YYYY-MM-DD` (leap years checked; `2026-02-30` is rejected) or `null` |
| `completed` | `true` or `false` (not `"true"`, not `1`) |
| Body | Must be a JSON object; unknown fields are rejected |
| `search` | Trimmed, max 200 characters; `%` and `_` are matched literally |
