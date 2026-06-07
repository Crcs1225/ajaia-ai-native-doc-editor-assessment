# AI Workflow Note

## AI Tools Used

- Codex for planning, implementation support, documentation drafting, and verification checklists.
- Claude would be useful for an independent review of UX copy or architecture tradeoffs, but the implementation decisions remained human-reviewed.

## Where AI Sped Up the Work

AI materially helped with:

- Turning the ambiguous prompt into a scoped product slice.
- Identifying the fastest realistic MVP under the 4-6 hour limit.
- Drafting the initial implementation plan and reviewer checklist.
- Generating documentation structure for README, architecture, submission, and walkthrough notes.
- Reviewing likely edge cases around sharing, unsupported uploads, and persistence.

## What AI Output I Changed or Rejected

I rejected or narrowed AI suggestions that would overbuild the assignment:

- Full Google Docs parity.
- Real-time collaboration as a core feature.
- `.docx` parsing as a requirement.
- Production authentication.
- Enterprise-grade role permissions.
- A full framework rewrite just to adopt a richer editor.

The final implementation keeps the Node server but adds focused production improvements: Postgres support, signed-session auth, server-side HTML sanitization, Quill editing, and Playwright E2E coverage.

## Human Judgment Applied

The key human decisions were:

- Use seeded login accounts to demonstrate real session flow without building registration.
- Store sanitized editable HTML because it matches the Quill editor approach.
- Limit uploads to `.txt` and `.md`, and state that clearly in UI and docs.
- Keep access checks in the backend store rather than trusting frontend state.
- Include automated tests for auth, sanitization, storage selection, and the main browser workflow.

## Verification Approach

Correctness and reliability were verified through:

- Automated tests with Node's built-in test runner.
- Playwright E2E test for the full create, save, share, and recipient-open flow.
- Manual create, edit, save, refresh, and reopen checks.
- Manual upload checks for supported and unsupported file types.
- Manual sharing check by switching seeded users.
- Static syntax checks for server and browser JavaScript.
- Review of README, architecture note, and submission checklist.

## UX Quality Checks

Before submission, I checked that:

- The first screen exposes the main actions without setup guesswork.
- Owned and shared documents are visually distinct.
- Save status is visible.
- Upload limitations are shown near the upload control.
- Sharing shows owner intent and current shared users.
- Seeded credentials are visible in the UI and documented in the README.
