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
  | Auth/session, sanitizer, storage adapter
  v
Convex CONVEX_URL, Postgres DATABASE_URL, or local data/db.json fallback
```

## Frontend

The frontend lives in `public/`:

- `index.html` defines the dashboard, editor, toolbar, upload control, and share panel.
- `styles.css` defines a restrained productivity-tool UI.
- `app.js` handles login/logout, document CRUD, save state, file import, sharing, and API calls.
- The login screen supports seeded account shortcuts and registering new review users.

The editor uses Quill, served from local npm assets through `/vendor/quill.js` and `/vendor/quill.snow.css`. This gives the product a more reliable editing surface than raw `contenteditable` while keeping the app lightweight.

## Backend

The backend lives in `src/`:

- `server.js` serves static files and JSON API routes.
- `auth.js` owns password hashing and signed session cookies.
- `sanitize.js` owns server-side HTML sanitization.
- `storeFactory.js` selects explicit `DB_FILE`, Convex, Postgres, then JSON fallback.
- `convexDocumentStore.js` adapts the existing server API to Convex.
- `documentStore.js` owns local JSON persistence.
- `postgresDocumentStore.js` owns optional Postgres persistence.
- `convex/` owns the Convex schema and document/user/share functions.

Main API behavior:

- `GET /api/users`
- `GET /api/session`
- `POST /api/login`
- `POST /api/register`
- `POST /api/logout`
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PUT /api/documents/:id`
- `POST /api/documents/:id/shares`
- `POST /api/import`

## Data Model

The storage model contains:

- `users`: seeded and registered review users with PBKDF2 password hashes.
- `documents`: title, HTML content, owner ID, created timestamp, updated timestamp.
- `shares`: document ID, shared user ID, role, created timestamp.

Each document has exactly one owner. Shared users can open and edit shared documents in this MVP. Only owners can grant additional shares.

## Access Logic

Access rules are centralized in the store adapters:

- Owners can read, edit, and share their documents.
- Shared users can read and edit documents shared with them.
- Users without owner or share access receive a 403 error.
- Owners cannot share a document with themselves.
- Duplicate shares are ignored safely.

The browser never sends a trusted `userId`. The server reads the signed HTTP-only session cookie and derives the current user from it.

## Sanitization

All document HTML is sanitized on create, update, and import before persistence. The sanitizer allows document formatting tags such as headings, paragraphs, lists, emphasis, underline, code, blockquote, and safe links, while stripping scripts, event handlers, and unsafe URL schemes.

## File Import

Supported file types:

- `.txt`
- `.md`

The server rejects unsupported extensions. Imported Markdown receives lightweight conversion for headings and bullet lists, then becomes editable HTML content.

## Testing Strategy

Automated tests use Node's built-in test runner and Playwright:

- Sharing test: verifies a shared document appears under the recipient's shared list and remains owned by the creator.
- File validation test: verifies unsupported import types are rejected.
- Auth tests: verify password hashing and signed session validation.
- Sanitizer test: verifies unsafe HTML is stripped while formatting remains.
- Store factory test: verifies Postgres is selected when `DATABASE_URL` is configured.
- Registration test: verifies newly registered users can be looked up and duplicate emails are rejected.
- Convex smoke verification: registers two users against Convex, creates a document, shares it, and verifies recipient `Shared with Me`.
- E2E test: verifies login, create, edit, save, share, logout, and recipient access.

Manual verification covers the end-to-end reviewer flow:

- Create, rename, edit, save, refresh, reopen.
- Format content with toolbar controls.
- Import `.txt` or `.md`.
- Share with another seeded or newly registered user.
- Sign out, sign in as the recipient, and confirm owned/shared distinction.

## Deprioritized Work

- Real-time collaboration indicators.
- Comments and suggestions.
- Version history.
- `.docx` parsing.
- Role-based permission matrix.

These are reasonable future improvements, but they would reduce confidence in the core product slice under the assignment time limit.
