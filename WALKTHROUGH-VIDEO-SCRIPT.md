# Walkthrough Video Script

## Target Length

3-5 minutes.

## Recording Flow

| Time | Section |
| --- | --- |
| 0:00-0:30 | Introduction and scope |
| 0:30-1:30 | Main document workflow |
| 1:30-2:20 | File upload/import |
| 2:20-3:20 | Sharing flow |
| 3:20-4:10 | Architecture and tradeoffs |
| 4:10-5:00 | AI workflow and verification |

## Script

### 0:00-0:30 - Introduction

Hi, this is my submission for the Ajaia AI-Native Full Stack Developer Assignment. I built a lightweight collaborative document editor focused on a realistic 4-6 hour product slice: document creation, rich-text editing, file import, sharing, persistence, and a deployed review flow.

### 0:30-1:30 - Main Document Workflow

On the dashboard, I can switch between seeded users, create a new document, and see owned documents separately from shared documents.

I will create a new document, rename it, and open the editor. The editor supports basic rich-text formatting: bold, italic, underline, headings, bullet lists, and numbered lists. After saving and refreshing, the content and formatting remain available.

### 1:30-2:20 - File Upload

For file upload, I intentionally scoped support to `.txt` and `.md` files. That keeps the workflow product-relevant and reliable within the timebox. I can import a text or Markdown file and turn it into editable document content.

Unsupported file types show a validation message instead of failing silently.

### 2:20-3:20 - Sharing Flow

Each document has an owner. From the share panel, I can grant another seeded user access. After sharing, I switch to that user and the document appears under Shared with me, not Owned by me. This demonstrates the core access model without spending the assignment time on full authentication.

### 3:20-4:10 - Architecture and Tradeoffs

The app is built as a small full stack application. The frontend handles the document dashboard, editor, upload, and share panel. The backend persists users, documents, and document share records.

The main tradeoff was choosing depth over breadth. I did not build real-time collaboration, comments, version history, or `.docx` import. Those are good future extensions, but the core product flow is complete and reviewable.

### 4:10-5:00 - AI Workflow and Verification

I used AI tools to speed up planning, implementation scaffolding, documentation, and edge-case review. I did not treat AI output as final. I narrowed the scope, rejected overbuilt suggestions, and verified the product manually and with automated tests.

The main verification path was create, edit, save, refresh, reopen, upload, share, switch users, and confirm owned versus shared behavior.

Thank you for reviewing my submission.

