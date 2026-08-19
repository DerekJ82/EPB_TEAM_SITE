# EPB Pipeline Hub — Unified Dashboard Plan

## Overview

A single web application that aggregates the status of all EPB pipeline trackers into one place for the team. Instead of opening three separate dashboards, the team sees one page with a top-level "all clear / action required" hero banner and a card for each pipeline — styled to match the IPP Portal.

---

## Current State (Three Separate Trackers)

| Tracker | Purpose | Access |
|---------|---------|--------|
| **PSO One Pager Pipeline** | 13-stage approval workflow (slide creation → SVP sign-off) | Via epb-hub |
| **Consolidated Billed Revenue** | Monthly data submission tracking (EPB, TAC, TH, TDX, TPS) | tracker.bat → web app |
| **Consolidated BR Queries** | BQ query + consolidation workflow execution monitoring | tracker.bat → Google Sheet |

Each tracker has its own Google Chat space, its own bat file, and its own web UI. The team has to check three places to understand whether anything is blocked.

---

## Architecture

### Recommended Approach: Unified Apps Script reading all CONFIG sheets directly

A new standalone Apps Script project reads the CONFIG/STATUS tabs from each tracker's Google Sheet and renders a single aggregated dashboard.

**Why this approach:**
- No cross-script API calls (each script is isolated by design)
- Google Sheets are already the source of truth for all three trackers
- Easy to add more pipelines later — add one new `_get*Status()` function and one new card
- Single deploy URL — one bat file, one bookmark for the team

**Not recommended:** iFraming the individual trackers — iframes can't be aggregated into a unified status banner and behave poorly in Apps Script web apps.

---

## Data Sources

| Tracker | Google Sheet ID | Tab to Read |
|---------|-----------------|-------------|
| PSO One Pager | `1wt1DgVwHxkDkTTFbJiFY6UQ_bEvs_sof_FNqDMl3pXA` | `PIPELINE_STATUS` (13 stage rows) |
| Consolidated BR | `1_Pv9gOxUesAmgMlyngyIFIzQFVtlJktaHMU36vAZg7g` | `CONFIG` + `DATA_STATUS` |
| Queries Pipeline | `19ioEbx2qjS74CIuvg95aS0_BzeLokXWkCL8bgEeBSzw` | `CONFIG` |

---

## New Files to Create

```
G:\Shared drives\EPB Planning Drive\1 - Consolidated\11 - Claude Code Projects\
  Projects\
    EPB Pipeline Hub\
      apps-script\
        Code.gs          ← aggregates data from all three tracker sheets
        Dashboard.html   ← unified web UI (IPP Portal design)
      tracker.bat        ← opens the deployed web app URL
```

No changes required to any existing tracker code.

---

## Design System — Match IPP Portal Exactly

All styling is taken directly from `Projects/IPP/apps-script/Tracker.html`.

### CSS Design Tokens

```css
:root {
  --purple:   #4B286D;
  --purple-d: #38205A;
  --purple-l: #63398B;
  --ink:      #2A1A3E;
  --tint:     #F6F2FA;
  --tint2:    #F0EAF7;
  --line:     #E8E6EC;
  --line-d:   #D8D5DE;
  --grey:     #54505C;
  --grey-l:   #918A9C;
  --green:    #4B8500;
  --amber:    #856404;
  --red:      #721C24;
  --gut:      clamp(20px, 5vw, 72px);
  --ease:     cubic-bezier(0.16, 1, 0.3, 1);
  --disp:     "TELUS SA Display", Inter, "Helvetica Neue", Arial, sans-serif;
  --text:     "TELUS SA Text",    Inter, "Helvetica Neue", Arial, sans-serif;
  --micro:    "TELUS SA Micro",   Inter, "Helvetica Neue", Arial, sans-serif;
}
```

### Font Loading

Load Inter from Google Fonts as fallback (same as IPP Portal):
```html
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
```

### Page Structure

Mirrors the IPP Portal layout exactly:

```
┌─────────────────────────────────────────────────────┐
│  NAV  — frosted glass, fixed, 68px, EPB Pipeline Hub│
├─────────────────────────────────────────────────────┤
│  HERO — gradient bg, overall status, key metrics    │
│  "All Clear" / "Action Required" / "Pipeline Issue" │
├──────────────┬──────────────┬───────────────────────┤
│  CARD: PSO   │  CARD: CBR   │  CARD: BR Queries     │
│  Pipeline    │  Billed Rev  │  Queries Pipeline     │
├──────────────┴──────────────┴───────────────────────┤
│  FOOTER — purple background, white text             │
└─────────────────────────────────────────────────────┘
```

---

## Dashboard UI Design

### Navigation Bar (`.nav`)
- Fixed top, 68px height, frosted glass: `rgba(255,255,255,0.96)` + `backdrop-filter: blur(8px)`
- Left: "EPB Pipeline Hub" brand name
- Right: last-updated timestamp + refresh button
- Matches IPP Portal nav exactly

### Hero Section (`.hero`)
- Gradient background: `linear-gradient(180deg, rgba(75,40,109,0.04) 0%, #fff 100%)`
- Padding: 80px top, 56px bottom
- **Eyebrow**: "EPB COMMERCIAL PLANNING" (uppercase, 11px, purple, letter-spacing .18em)
- **Title**: "Pipeline Hub" — `clamp(31px, 4.8vw, 64px)`, weight 900, `--ink`
- **Hero stats row** (3 metrics, same style as IPP Portal):
  - Total Pipelines Active
  - Pipelines On Track
  - Action Required

Overall status drives the hero background tint:
- All clear → subtle green tint
- Action required → subtle amber tint
- Issue → subtle red tint

### Status Badge System (matches IPP Portal exactly)

```css
.badge               { font: 700 10px var(--micro); padding: 3px 9px; border-radius: 20px; }
.badge-complete      { background: #EEF7E0; color: var(--green); }
.badge-progress      { background: rgba(75,40,109,0.15); color: var(--purple); }
.badge-pending       { background: var(--tint2); color: var(--purple); }
.badge-at-risk       { background: #FFF3CD; color: var(--amber); }
.badge-overdue       { background: #F8D7DA; color: var(--red); }
```

### Pipeline Cards (`.card`)

Same card style as IPP Portal:
- `border: 1px solid var(--line)`, `border-top: 3px solid var(--purple)`
- `border-radius: 12px`, padding 22px
- Hover: `transform: translateY(-3px)`, `box-shadow: 0 14px 32px rgba(75,40,109,0.09)`

Card layout — three columns on desktop, stacked on mobile:
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
```

---

### Card 1 — PSO One Pager Pipeline

```
┌───────────────────────────────────────────────────┐
│ PSO ONE PAGER                        [IN PROGRESS]│
│ Stage 9 of 13 — CoS Review                        │
│                                                   │
│ ████████████░░░░░░░░░░  69%                       │
│                                                   │
│ ⚠ WAITING — Christine Gallant, Erynn Hunter,      │
│             John Karazivan                        │
│                                                   │
│                           [Open PSO Tracker →]   │
└───────────────────────────────────────────────────┘
```

**Data mapped from PSO PIPELINE_STATUS tab:**
- Current stage number + name (find last IN_PROGRESS or WAITING row)
- Progress bar = (current stage / 13) × 100%
- Status badge: IN_PROGRESS → `badge-progress`, WAITING → `badge-at-risk`, COMPLETE → `badge-complete`, FAILED → `badge-overdue`
- Blocker text from the `notes` column of the WAITING stage (shown only when WAITING)
- Link to PSO tracker (epb-hub URL)

---

### Card 2 — Consolidated Billed Revenue

```
┌───────────────────────────────────────────────────┐
│ CONSOLIDATED BILLED REVENUE               Jul 2026│
│                                                   │
│  EPB    ✓ Complete    TAC    ✓ Complete           │
│  TH     ⏳ Pending    TDX    ✓ Complete           │
│  TPS    ✓ Complete                               │
│                                                   │
│  4 of 5 segments complete      [badge-at-risk]   │
│                           [Open CBR Tracker →]   │
└───────────────────────────────────────────────────┘
```

**Data mapped from CBR CONFIG + DATA_STATUS tabs:**
- Current period badge (top right)
- Per-segment rows: COMPLETE → `badge-complete`, PENDING → `badge-pending`
- Overall status badge driven by completion count
- Link to CBR tracker web app

---

### Card 3 — Consolidated BR Queries Pipeline

```
┌───────────────────────────────────────────────────┐
│ BR QUERIES PIPELINE                       Jul 2026│
│                                                   │
│  ●────●────○────○                                 │
│  Sent  Queries  Check  Done                       │
│                                                   │
│  GoCo ✓  PWN ✓  WLN ✗  Master ✓                  │
│                                                   │
│  Stage 2 of 4              [badge-at-risk]       │
│                      [Open Queries Tracker →]    │
└───────────────────────────────────────────────────┘
```

**Data mapped from Queries CONFIG tab:**
- 4-step progress track using IPP Portal's `.pt-step` / `.pt-circle` pattern (replaces the current custom track style)
- Table status row using `badge-complete` / `badge-overdue` pills
- Overall status badge
- Link to Queries tracker

---

### Buttons (matches IPP Portal)

```css
.btn         { border-radius: 999px; padding: 10px 24px; font: 700 13px var(--text); }
.btn-primary { background: var(--purple); color: #fff; box-shadow: 0 8px 24px rgba(75,40,109,0.22); }
.btn-ghost   { background: transparent; color: var(--purple); border: 1.5px solid var(--purple); }
```

### Footer (matches IPP Portal)

```css
footer { background: var(--purple); color: #fff; padding: 28px var(--gut); }
```

Content: "EPB Commercial Planning · Pipeline Hub" left, "Auto-refreshes every 30s" right.

---

## Code.gs — Backend Structure

```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('EPB Pipeline Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDashboardData() {
  return {
    pso:     _getPSOStatus(),
    cbr:     _getCBRStatus(),
    queries: _getQueriesStatus(),
    asOf:    new Date().toISOString(),
  };
}

function _getPSOStatus() {
  // Opens: 1wt1DgVwHxkDkTTFbJiFY6UQ_bEvs_sof_FNqDMl3pXA
  // Tab: PIPELINE_STATUS
  // Returns: { currentStage, totalStages: 13, stageName, status, blocker, pct, trackerUrl }
}

function _getCBRStatus() {
  // Opens: 1_Pv9gOxUesAmgMlyngyIFIzQFVtlJktaHMU36vAZg7g
  // Tabs: CONFIG (period), DATA_STATUS (per-segment)
  // Returns: { currentPeriod, segments: [{name, status}], completeCount, totalCount, trackerUrl }
}

function _getQueriesStatus() {
  // Opens: 19ioEbx2qjS74CIuvg95aS0_BzeLokXWkCL8bgEeBSzw
  // Tab: CONFIG
  // Returns: { currentPeriod, stage, pipelineStatus, tables: [{name,pass}], trackerUrl }
}
```

Each `_get*Status()` function is self-contained. Adding a fourth pipeline (e.g., IPP) = one new function + one new card.

---

## Google Chat Consolidation (Optional)

Currently each tracker posts to its own Chat space. To consolidate:

1. Create a new Google Chat space: **"EPB Pipelines"**
2. Add one incoming webhook per tracker — the webhook name appears as the sender so messages stay attributable
3. Update `CHAT_WEBHOOK_URL` in Script Properties for each existing tracker

This is independent of the unified UI and can be done at any time.

---

## Setup Steps (Once Built)

1. Create a new Google Apps Script project named **"EPB Pipeline Hub"**
2. Add `Code.gs` and `Dashboard.html`
3. Authorize access to all three source sheets on first run (standard OAuth)
4. Deploy as web app: Execute as **Me**, Access: **Anyone at TELUS**
5. Paste deployed URL into `tracker.bat`
6. Share bat file or URL with the team

---

## Admin: Access Requests Section

An admin-only section rendered below the pipeline cards. Only visible when the current user's email appears in the `ADMINS` column of the "Admin - Access" tab in the EPB Hub master sheet.

### Purpose

Eliminates the current spreadsheet-checkbox approval workflow. Admins can approve or deny EPB Hub access requests directly from a modal in this dashboard — no spreadsheet visit required.

### Data Source

| Sheet | ID | Tab |
|-------|----|-----|
| EPB Hub master | `1OJpOFEwV0YaT1rUoygxXqypv5OwdDcBZX_q-_29Grug` | `Access Requests` (pending rows) |
| EPB Hub master | `1OJpOFEwV0YaT1rUoygxXqypv5OwdDcBZX_q-_29Grug` | `Admin - Access` (write approval here) |

### Backend Functions (Code.gs)

| Function | Purpose |
|----------|---------|
| `_isAdminUser()` | Returns `true` if current user's email is in the ADMINS column of "Admin - Access" |
| `getPendingAccessRequests()` | Returns array of pending request rows: `{ rowIndex, email, dashboard, accessColumn, requestedAt }` |
| `approveAccessRequest(rowIndex, email, accessColumn)` | Writes email to target column in "Admin - Access", marks row "Approved", emails requester |
| `denyAccessRequest(rowIndex)` | Marks row "Denied" in "Access Requests" sheet, no access granted |

`getDashboardData()` includes `isAdmin: _isAdminUser()` so the frontend knows whether to show the section.

### Security

- Every backend function re-checks `_isAdminUser()` server-side — the `isAdmin` flag in `getDashboardData()` is display-only
- `approveAccessRequest()` validates `accessColumn` against `ACCESS_COLUMN_MAP` before writing (prevents privilege escalation)
- Row data passed back to the frontend is read from the sheet; the frontend passes only `rowIndex` to trigger an approval — the backend re-reads the row to get email and column

### UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  ADMIN                                                    │
│  Access Requests                                          │
│  Pending requests from EPB Hub users.                     │
│                                                           │
│  Email              Dashboard          Requested   Action │
│  ──────────────── ───────────────── ──────────── ─────── │
│  user@telus.com   Flash Weekly      Aug 19 2026  [Approve]│
│                                                  [Deny]  │
│  user2@telus.com  Core Wireless     Aug 18 2026  [Approve]│
│                                                  [Deny]  │
└──────────────────────────────────────────────────────────┘
```

Clicking **Approve** opens a confirmation modal before calling `approveAccessRequest()`. On success:
- Toast: "[email] approved for [dashboard]"
- Table refreshes automatically
- Requester receives an email: "Your access has been approved. Refresh EPB Hub to view your dashboard."

Clicking **Deny** acts immediately (no modal), marks the row "Denied" in the sheet.

### No onEdit Trigger Required

The EPB Hub currently approves via a spreadsheet checkbox + installable `onEdit` trigger. This UI replaces that step entirely — approvals happen via a direct `google.script.run` call to `approveAccessRequest()`.

---

## Future Additions

| Pipeline | Source | Notes |
|----------|--------|-------|
| IPP Portal | `Projects/IPP/tracker.bat` already exists | Ready to add as Card 4 |
| Additional pipelines | New sheet → new `_get*Status()` → new card | Fully modular |
| Unified "Run Check" button | Surface BQ post-run check from hub UI | Phase 2 |
| Weekly email digest | Single email across all pipelines every Monday | Phase 2 |

---

## Summary of Work Required

| Task | Effort |
|------|--------|
| Confirm PSO PIPELINE_STATUS tab column layout | Small |
| Confirm CBR DATA_STATUS tab column layout | Small |
| Write `Code.gs` (3 reader functions + doGet) | Medium |
| Write `Dashboard.html` (IPP Portal design, 3 cards) | Medium |
| Deploy and test | Small |
| Create `tracker.bat` | Trivial |
| Optional: Google Chat consolidation | Small |

No changes to any existing tracker code or infrastructure required.
