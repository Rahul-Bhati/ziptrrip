# Assignee slice — spec for review

Draft only. Nothing here is built yet. This covers brainstorm ranks 1–4: optional assignee, person embedded on the todo, seeded people, and an update for the database file that already exists.

Please mark anything you want changed before implementation.

## What this slice does

A todo can name one person, or nobody. The person comes from a `people` table. The create form has an Assignee dropdown that starts on **Unassigned**. The list row and the detail page show the name. The detail edit form can change the person or set it back to Unassigned.

There is still no login. A person is a stored name, not an account.

## Out of scope

- Filter, sort, or search by assignee
- A screen to add, rename, or delete people
- Editing the assignee inline on the list row
- More than one person per todo
- A count of open todos next to each name

## Data

### `people`

| Column | Type | Rule |
|---|---|---|
| `id` | integer | Auto-increment, never reused |
| `name` | text | Required, trimmed, 1–100 characters. Unique, ignoring letter case |

### `todos.assignee_id`

Nullable integer. `NULL` means Unassigned. When it has a value, that id must exist in `people`.

Existing todos stay unassigned. Their other fields do not change.

## Database file that already exists

`server/src/db/schema.ts` runs `CREATE TABLE IF NOT EXISTS`. That creates `people` on an old database, and it does **not** add a column to the `todos` table that is already there.

On startup, after the current schema runs:

1. Create `people` if it is missing (same `IF NOT EXISTS` style as `todos`).
2. If `todos` has no `assignee_id` column, add it as a nullable integer.
3. Turn on SQLite foreign keys for the connection (`PRAGMA foreign_keys = ON`). The app does not do this today. New writes then cannot store an id that is not in `people`. The API still checks the id itself and returns the usual `400` validation error, so the client gets a field message either way.

No data is copied or deleted. Tests keep using a fresh in-memory database, so they pick this up by starting empty.

**Confirm:** enabling foreign keys is the one startup behavior that applies to the whole database, not only this column. Say if you would rather check the id only in application code and leave the pragma off.

## API

Same envelope as today: `{ "data": ... }` and `{ "error": { "code", "message", "details" } }`. Unknown body fields stay rejected.

The client **sends** `assigneeId`. The client **reads** `assignee`. The response does not also include `assigneeId`.

### Person object

```json
{ "id": 1, "name": "Priya" }
```

### Todo object (added field)

```json
"assignee": { "id": 1, "name": "Priya" }
```

or `"assignee": null`.

List, get-one, create, and update all return this field.

### `GET /api/people`

`200` and `{ "data": [ { "id", "name" }, ... ] }`, sorted by name, A→Z, case-insensitive. No query params in this slice.

### `POST /api/people`

For the API and for seed. The UI does not call it.

| Field | Required | Rule |
|---|---|---|
| `name` | yes | string, trimmed, 1–100 characters |

`201` and `{ "data": { "id", "name" } }`.

`400` when the name is empty, too long, not a string, or already used by another person (comparison ignores case). Duplicate message is on field `name`.

No get-one, update, or delete for people in this slice.

### Create a todo — `assigneeId`

| Input | Result |
|---|---|
| Field omitted | Unassigned (`assignee: null`) |
| `null` | Unassigned |
| Positive integer that exists in `people` | That person |
| `0`, a fraction, a string, or an id that is not in `people` | `400`, field `assigneeId` |

### Update a todo — `assigneeId`

Same meaning as `dueDate`: omit the field and the owner stays as it is; `null` clears it. A positive integer that exists replaces the owner. An unknown id is `400` on field `assigneeId`.

`updatedAt` still changes on every successful update.

## Screens

### Create form (list page)

An Assignee `<select>` in the same row as Priority and Due date. It is always visible.

- First option: **Unassigned** (the default).
- Then one option per person, using the names from `GET /api/people`.
- Submit sends `assigneeId: null` for Unassigned, or the numeric id.
- After a successful add, the dropdown returns to Unassigned, same as priority returning to Medium.
- If loading people fails, the form shows the error and still allows Unassigned, so a todo can be created.
- If there are zero people, the only option is Unassigned, with the note “No people yet”.

The list page loads people once, together with the todos, and passes the list into the form and the rows.

### List row

Next to the priority badge: the person’s name, or the muted word **Unassigned**. The row does not edit it.

### Detail page

A fact row, **Assignee**, with the name or **Unassigned**.

### Detail edit form

A select with the same options as create. The draft stores the selected id, or an empty value for Unassigned.

Save still sends only changed fields. Choosing a different person sends `{ "assigneeId": 2 }`. Choosing Unassigned sends `{ "assigneeId": null }`. Leaving it untouched sends no `assigneeId`. A server error for that field shows under the select. The unsaved-changes warning already keys off “any field changed,” so it covers this field once the draft includes it.

Search, status tabs, and sort stay as they are.

## Seed

Four people, inserted by the people API (or the same validation), not by a special SQL path:

| Name |
|---|
| Alex |
| Jordan |
| Priya |
| Sam |

`npm run seed` today does nothing when any todo exists. Change that only for people:

- If a sample name is missing, insert that person.
- Do this even when todos already exist.
- Do not change the assignee on todos that are already in the database.
- Do not add the sample todos unless the todo table is empty, or the command is `--force` (same rule as now).

When the sample todos **are** inserted, set assignees like this so the demo shows both states:

| Sample todo | Assignee |
|---|---|
| Read the assignment brief | Alex |
| Design the REST API | Priya |
| Write unit and API tests | Sam |
| Build the todo list page | Jordan |
| Build the single todo page | Priya |
| Write README and docs | Unassigned |
| Renew gym membership | Alex |
| Buy groceries | Unassigned |

## Done when

- A new todo can be created with a person or with Unassigned.
- The list and the detail page show that choice.
- Edit can switch the person or clear it, and a save with no edits still sends nothing.
- `GET /api/todos`, `GET /api/todos/:id`, create, and update include `assignee`.
- An unknown `assigneeId` returns `400` with field `assigneeId`.
- `GET /api/people` and `POST /api/people` behave as written above.
- An existing `server/data/todos.db` gains the column, old todos stay unassigned, and the app still starts.
- `npm run seed` on that existing file adds the four people and does not rewrite todos.
- Tests cover validation, the repository, the new and changed endpoints, and the column add on a database created with the old table.
- `README.md` (data model), `docs/API.md`, and `docs/FEATURES.md` describe the new field. Undocumented behavior does not count for this assignment.

## Decisions to confirm

1. Name length 1–100, unique ignoring case.
2. Request field `assigneeId`, response field `assignee` (`{ id, name } | null`).
3. `POST /api/people` exists; the UI has no add-person control.
4. Foreign keys turned on for the SQLite connection.
5. The four names and the sample assignments in the table above.
6. Seed inserts any missing sample people even when todos are already present, and leaves those todos unassigned.
