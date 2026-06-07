# Ajaia AI-Native Full Stack Developer Assignment Plan

## Goal

Build a lightweight collaborative document editor inspired by Google Docs within a 4-6 hour timebox. The product should demonstrate document creation, rich-text editing, file handling, sharing, persistence, deployment judgment, and practical AI-native workflow.

## Recommended MVP Scope

Ship a small but coherent full stack app called `Ajaia Docs Lite`.

Core user story:

> A reviewer can log in as a seeded user, create a rich-text document, rename it, edit and save it, import text/Markdown content from a file, share the document with another seeded user, switch users, and see the document appear under shared documents.

## Recommended Stack

| Area | Choice | Why |
| --- | --- | --- |
| Framework | Next.js App Router + TypeScript | Fast full stack delivery, easy deployment to Vercel, API routes/server actions available. |
| Styling | Tailwind CSS | Fast, consistent UI without heavy design setup. |
| Editor | TipTap | Practical rich-text editor with bold, italic, underline, headings, and lists. |
| Persistence | SQLite + Prisma | Simple local persistence, easy schema, no paid external service. |
| Auth model | Mocked seeded users | Keeps scope focused on sharing logic, not auth infrastructure. |
| File upload | `.txt` and `.md` import into a new or current document | Product-relevant and easy to explain clearly. |
| Tests | Vitest or Playwright component/API test | At least one meaningful automated test around sharing or document persistence. |
| Deployment | Vercel if using hosted DB, or Render/Fly/Railway with SQLite file persistence | Reviewers need a live URL; deployment path should match persistence choice. |

If using Vercel, SQLite file persistence is not ideal for production because serverless files are ephemeral. For fastest reliable deployment, use Supabase Postgres, Neon Postgres, or Vercel Postgres if a free tier is available. If avoiding external services, deploy to Render with a persistent disk or document local-only persistence clearly.

## Product Priorities

1. Document create, rename, edit, save, reopen.
2. Rich-text editing with a clean toolbar.
3. File import for `.txt` and `.md`.
4. Owner/shared document distinction.
5. Simple share-by-user flow.
6. Persistence with preserved editor JSON.
7. README, architecture note, AI workflow note, and video script.

## Deliberate Scope Cuts

- No real-time multiplayer editing.
- No Google Docs parity.
- No enterprise auth or permissions.
- No comments or suggestion mode unless time remains.
- No `.docx` parsing unless finished early.
- No complex folder hierarchy.
- No full-text search.

## Suggested 4-6 Hour Execution Timeline

| Time | Work |
| --- | --- |
| 0:00-0:30 | Scaffold project, install editor/database/test dependencies, define schema. |
| 0:30-1:30 | Build document list, create document, rename document, seeded user switcher. |
| 1:30-2:30 | Add TipTap editor, toolbar, save/reopen JSON content. |
| 2:30-3:15 | Add `.txt`/`.md` upload import. |
| 3:15-4:00 | Add sharing: owner, grant access, owned/shared sections. |
| 4:00-4:45 | Add validation/error handling and at least one automated test. |
| 4:45-5:30 | Polish UI, write README, architecture note, AI workflow note, SUBMISSION.md. |
| 5:30-6:00 | Deploy, record 3-5 minute walkthrough, final checklist. |

## Data Model

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  documents Document[]
  shares    DocumentShare[]
}

model Document {
  id        String   @id @default(cuid())
  title     String
  content   Json
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  shares    DocumentShare[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model DocumentShare {
  id         String   @id @default(cuid())
  documentId String
  userId     String
  role       String   @default("viewer")
  document   Document @relation(fields: [documentId], references: [id])
  user       User     @relation(fields: [userId], references: [id])

  @@unique([documentId, userId])
}
```

## Main Screens

1. Document dashboard
   - User switcher
   - Owned documents
   - Shared with me
   - Create document button
   - Import document button

2. Editor screen
   - Title input
   - Rich-text toolbar
   - Editable document body
   - Save status
   - Share panel
   - Attachment/import control

3. Share panel
   - Current owner
   - Select seeded user by email
   - Grant access
   - List shared users

## Acceptance Checklist

- [ ] User can create a new document.
- [ ] User can rename a document.
- [ ] User can edit rich text in the browser.
- [ ] Bold, italic, underline, heading, bullet list, and numbered list controls work.
- [ ] User can save and reopen the document.
- [ ] Formatting is preserved after refresh.
- [ ] User can upload `.txt` or `.md` content.
- [ ] Uploaded content becomes a document or imports into the active draft.
- [ ] Each document has an owner.
- [ ] Owner can share with another seeded user.
- [ ] Shared document appears separately from owned documents.
- [ ] Sharing data persists after refresh.
- [ ] README has local setup and run instructions.
- [ ] Architecture note explains tradeoffs.
- [ ] AI workflow note explains AI usage and verification.
- [ ] At least one meaningful automated test passes.
- [ ] Live URL is available.
- [ ] Walkthrough video URL is included.

