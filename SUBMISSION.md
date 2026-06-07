# Submission Checklist

## Included Materials

- [ ] Source code
- [ ] `README.md` with local setup and run instructions
- [ ] `ARCHITECTURE.md`
- [ ] `AI-WORKFLOW-NOTE.md`
- [ ] `SUBMISSION.md`
- [ ] Live product URL
- [ ] Walkthrough video URL text file
- [ ] Screenshots or short demo GIF if setup needs extra help

## Live Product URL

```text
[paste live deployment URL here]
```

## Walkthrough Video URL

```text
[paste Loom, YouTube, Vimeo, or Google Drive video URL here]
```

## Seeded Users / Test Accounts

| Name | Email | Purpose |
| --- | --- | --- |
| Alex Owner | alex@ajaia.test | Create and own documents |
| Blair Reviewer | blair@ajaia.test | Receive shared documents |
| Casey Editor | casey@ajaia.test | Additional share target |

Additional reviewers can register from the login screen and then receive shared documents.

## What Works

- [x] Create document
- [x] Rename document
- [x] Rich-text editing
- [x] Save and reopen document
- [x] Formatting persists after refresh
- [x] Upload `.txt` or `.md`
- [x] Share document with another seeded user
- [x] Register new users for sharing review
- [x] Owned/shared document distinction
- [x] Persistence for documents and shares
- [x] At least one automated test
- [x] Real login/session flow with seeded accounts
- [x] Convex persistence via `CONVEX_URL`
- [x] Postgres support via `DATABASE_URL`
- [x] Server-side HTML sanitization
- [x] Quill rich-text editor
- [x] Playwright E2E test
- [ ] Live deployment

## Incomplete or Partial Features

Write any partial work here before submitting:

```text
Live deployment and video URL still need to be added after deploying and recording.
```

## What I Would Build Next With Another 2-4 Hours

1. Add real authentication.
2. Add document version history.
3. Add comments or suggestion mode.
4. Add export to Markdown or PDF.
5. Add real-time presence indicators.
