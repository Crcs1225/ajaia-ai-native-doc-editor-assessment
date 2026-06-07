# Architecture Note

## Product Slice

The app is a lightweight document editor that covers the core workflow requested in the assignment: create a document, edit it with useful formatting, persist it, import content from a file, and share access with another user.

The goal is not Google Docs parity. The goal is a coherent product slice that reviewers can run and evaluate quickly.

## System Shape

```text
Browser UI
  |
  | fetch JSON API
  v
Node HTTP server
  |
  | DocumentStore
  v
data/db.json
```

## Frontend

The frontend lives in `public/`:

- `index.html` defines the dashboard, editor, toolbar, upload control, and share panel.
- `styles.css` defines a restrained productivity-tool UI.
- `app.js` handles user switching, document CRUD, save state, file import, sharing, and API calls.

The editor uses `contenteditable` and native browser formatting commands. This is a deliberate timebox tradeoff. A production version would likely use TipTap, ProseMirror, Lexical, or Slate, but the current implementation still demonstrates the editing flow and formatting requirements without network dependencies.

## Backend

The backend lives in `src/`:

- `server.js` serves static files and JSON API routes.
- `documentStore.js` owns persistence, seeded users, document access checks, sharing logic, and import validation.

Main API behavior:

- `GET /api/users`
- `GET /api/documents?userId=...`
- `POST /api/documents`
- `GET /api/documents/:id?userId=...`
- `PUT /api/documents/:id`
- `POST /api/documents/:id/shares`
- `POST /api/import`

## Data Model

The JSON store contains:

- `users`: seeded review users.
- `documents`: title, HTML content, owner ID, created timestamp, updated timestamp.
- `shares`: document ID, shared user ID, role, created timestamp.

Each document has exactly one owner. Shared users can open and edit shared documents in this MVP. Only owners can grant additional shares.

## Access Logic

Access rules are centralized in `DocumentStore`:

- Owners can read, edit, and share their documents.
- Shared users can read and edit documents shared with them.
- Users without owner or share access receive a 403 error.
- Owners cannot share a document with themselves.
- Duplicate shares are ignored safely.

## File Import

Supported file types:

- `.txt`
- `.md`

The server rejects unsupported extensions. Imported Markdown receives lightweight conversion for headings and bullet lists, then becomes editable HTML content.

## Testing Strategy

Automated tests use Node's built-in test runner:

- Sharing test: verifies a shared document appears under the recipient's shared list and remains owned by the creator.
- File validation test: verifies unsupported import types are rejected.

Manual verification covers the end-to-end reviewer flow:

- Create, rename, edit, save, refresh, reopen.
- Format content with toolbar controls.
- Import `.txt` or `.md`.
- Share with another seeded user.
- Switch users and confirm owned/shared distinction.

## Deprioritized Work

- Full authentication.
- Real-time collaboration indicators.
- Comments and suggestions.
- Version history.
- `.docx` parsing.
- Role-based permission matrix.

These are reasonable future improvements, but they would reduce confidence in the core product slice under the assignment time limit.

