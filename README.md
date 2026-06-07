# Ajaia Docs Lite

Lightweight collaborative document editor built for the AI-Native Full Stack Developer Assignment.

## Live Product URL

```text
[paste deployment URL here]
```

## What Works

- Create, rename, edit, save, and reopen documents.
- Rich-text editing with Quill: bold, italic, underline, headings, bullet lists, and numbered lists.
- File import for `.txt` and `.md` files.
- Simple sharing model with owner and shared users.
- Visible distinction between owned documents and shared documents.
- Convex cloud persistence through `CONVEX_URL`, with Postgres and local JSON fallback paths.
- Email/password login with signed HTTP-only session cookies.
- Open registration for additional review users.
- Server-side HTML sanitization before document content is stored.
- Automated unit tests plus Playwright E2E coverage.

## Tech Stack

- Node.js HTTP server.
- Browser HTML/CSS/JavaScript frontend.
- Quill rich-text editor served from installed npm assets.
- Convex persistent backend for hosted review storage.
- `pg` Postgres adapter for production deployment.
- JSON file persistence at `data/db.json` when Convex/Postgres are not configured.
- `sanitize-html` for server-side document sanitization.
- Node built-in test runner.
- Playwright E2E runner.

## Local Setup

Requirements:

- Node.js 20 or newer.

Run:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, run:

```bash
cmd /c npm run dev
```

## Tests

```bash
npm test
npm run test:e2e
```

PowerShell fallback:

```bash
cmd /c npm test
```

## Seeded Review Users

Use the login form with password:

```text
password123
```

| Name | Email |
| --- | --- |
| Alex Owner | alex@ajaia.test |
| Blair Reviewer | blair@ajaia.test |
| Casey Editor | casey@ajaia.test |

## Review Flow

1. Select `Alex Owner`.
2. Create a new document.
3. Rename the document and add formatted content.
4. Save, refresh, and reopen the document.
5. Import a `.txt` or `.md` file.
6. Share a document with `Blair Reviewer`.
7. Sign out and sign in as `Blair Reviewer`.
8. Confirm the document appears under `Shared with me`.

You can also create a new account from the login screen, sign back in as the owner, and share a document with the newly registered user.

## File Upload Support

Supported file types:

- `.txt`
- `.md`

Unsupported file types show a validation error. `.docx` import is intentionally out of scope for this timebox.

## Persistence Notes

For the current Convex-backed setup, set:

```text
CONVEX_URL=https://your-deployment.convex.cloud
SESSION_SECRET=replace-with-a-long-random-secret
```

The local `.env.local` file created by Convex is intentionally gitignored.

Optional Postgres fallback:

```text
DATABASE_URL=postgres://...
SESSION_SECRET=replace-with-a-long-random-secret
```

When neither Convex nor Postgres is configured, the app falls back to:

```text
data/db.json
```

The JSON fallback keeps local setup simple. Convex is now the preferred deployed persistence layer for this assessment.

## Known Tradeoffs

- No real-time collaborative cursors.
- No comments or suggestion mode.
- No `.docx` import.
- No version history.
- Basic shared edit access instead of enterprise roles.

These cuts keep the assignment focused on a complete end-to-end product slice within 4-6 hours.
