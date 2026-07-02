# Hours/Ledger — PRD

## Original Problem Statement
> "I need a web app that I can use to show my boss the hours spent on a project, I have a few ongoing projects, I want a way to show her what im doing and if the project was delivered or not, if im going to re edit the project after delivering it, etc etc"

## User Choices (from clarification)
- Access: Single user (me) + shareable read-only link for the boss
- Time entry: Manual (date + hours + description)
- Project status stages: In Progress → Delivered → Re-editing → Final
- Visual signal: Checkbox + strikethrough on delivered/final projects
- Design vibe: Clean minimal professional (Swiss/editorial)

## User Personas
1. **Creator (me)** — logs hours, manages projects, changes status.
2. **Boss (viewer)** — opens a shared URL and sees a read-only report of projects and hours.

## Core Requirements (static)
- Project CRUD with fields: name, client, description, deadline, status.
- Status enum: `in_progress`, `delivered`, `re_editing`, `final`.
- Time entry CRUD per project (date, hours, description).
- Aggregate stats: total hours, hours this week, active projects, delivered count.
- Filters + search on dashboard.
- Public shareable read-only URL with rotate/revoke support.
- Delivered/Final projects show strikethrough + dimmed background.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). All routes prefixed `/api`. UUID string IDs. Datetimes stored as ISO strings.
- **Frontend**: React + React Router + shadcn/ui + Tailwind. Sonner for toasts. Axios for API.
- **Storage**: MongoDB collections: `projects`, `time_entries`, `settings` (share token).
- **Design system**: Cabinet Grotesk (display) / Satoshi (body) / JetBrains Mono (numbers). No box-shadows, flat sharp borders.

## Endpoints
- `GET /api/projects` — list with total_hours (sorted active → delivered → final)
- `POST /api/projects` — create
- `GET/PUT/DELETE /api/projects/{id}` — read/update/delete (delete cascades entries)
- `GET/POST /api/projects/{id}/entries` — list/create entries
- `PUT/DELETE /api/entries/{id}` — update/delete entry
- `GET /api/stats` — aggregate stats
- `GET /api/share/token` — get-or-create shareable token
- `POST /api/share/rotate` — invalidate old, create new token
- `GET /api/share/{token}` — public read-only dashboard payload

## Frontend Routes
- `/` — Dashboard (project list, filters, stats)
- `/project/:id` — Project detail + time log
- `/share/:token` — Public read-only report

## What's been implemented (2026-02-11 — v1.0)
- Full project CRUD (dashboard + detail page)
- Full time entry CRUD (add/edit/delete inside project detail)
- 4-status workflow with dropdown + inline checkbox for quick deliver-toggle
- Strikethrough & dimmed row on delivered/final projects
- Search + filter chips (All / In Progress / Delivered / Re-editing / Final)
- Stats bar: total hours, this-week hours, active, delivered
- Shareable link (create/copy/rotate) → read-only public view with per-project expandable time log
- Empty states, toast feedback, confirmation on destructive actions
- Swiss/editorial visual system (Cabinet Grotesk + Satoshi + JetBrains Mono, flat sharp UI)
- 19/19 backend tests + full Playwright e2e verified

## Backlog
### P1 (next up)
- CSV / PDF export of hours per project or per date range (for boss reports/invoicing).
- Simple chart (hours per project / per week) on dashboard.
- Deadline highlighting (overdue in red, this-week in amber).

### P2
- Multi-user auth (Emergent Google Auth) if the user wants their boss (or team) to log in.
- Per-entry attachments / screenshots.
- Weekly digest email to boss.
- Timer-based tracking (start/stop).

## Next Action Items
- Await user feedback on the v1.
- If they like it → prioritise CSV export + charts for the "wow the boss" moment.
