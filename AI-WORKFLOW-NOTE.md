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
- Dependency-heavy editor setup that could slow down local review.

The final implementation uses a dependency-free Node server and browser editor because it is easier to run, inspect, and submit reliably within the timebox.

## Human Judgment Applied

The key human decisions were:

- Use seeded users to demonstrate sharing without spending time on auth.
- Store editable HTML because it matches the browser-native editor approach.
- Limit uploads to `.txt` and `.md`, and state that clearly in UI and docs.
- Keep access checks in the backend store rather than trusting frontend state.
- Include automated tests for the highest-risk business rule: document sharing.

## Verification Approach

Correctness and reliability were verified through:

- Automated tests with Node's built-in test runner.
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
- Seeded users are visible in the UI and documented in the README.

