# Ajaia Docs Lite

Lightweight collaborative document editor built for the AI-Native Full Stack Developer Assignment.

## Live Product URL

```text
[paste deployment URL here]
```

## What Works

- Create, rename, edit, save, and reopen documents.
- Rich-text editing in the browser with bold, italic, underline, headings, bullet lists, and numbered lists.
- File import for `.txt` and `.md` files.
- Simple sharing model with owner and shared users.
- Visible distinction between owned documents and shared documents.
- Persistence for documents and share records through a local JSON data store.
- Seeded users that simulate authentication for review.
- Automated tests for sharing and file validation.

## Tech Stack

- Node.js HTTP server, no external runtime dependencies.
- Browser HTML/CSS/JavaScript frontend.
- `contenteditable` editor with native browser formatting commands.
- JSON file persistence at `data/db.json`.
- Node built-in test runner.

I intentionally avoided a dependency-heavy setup so reviewers can run the project quickly without paid services or package registry issues.

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
```

PowerShell fallback:

```bash
cmd /c npm test
```

## Seeded Review Users

Use the in-app user switcher to simulate login:

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
7. Switch to `Blair Reviewer`.
8. Confirm the document appears under `Shared with me`.

## File Upload Support

Supported file types:

- `.txt`
- `.md`

Unsupported file types show a validation error. `.docx` import is intentionally out of scope for this timebox.

## Persistence Notes

The app persists to:

```text
data/db.json
```

For a production deployment, I would replace the JSON file with Postgres or SQLite on a persistent disk. For this assignment, the JSON store keeps the app simple and easy to inspect.

## Known Tradeoffs

- Seeded users instead of full authentication.
- No real-time collaborative cursors.
- No comments or suggestion mode.
- No `.docx` import.
- No version history.
- Basic shared edit access instead of enterprise roles.

These cuts keep the assignment focused on a complete end-to-end product slice within 4-6 hours.

