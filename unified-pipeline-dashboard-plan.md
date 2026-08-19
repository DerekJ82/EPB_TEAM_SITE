# EPB Team Site — Build Plan

## Overview

A Google Apps Script web application that serves as the EPB Strategy and Planning team's central hub. Built on the **Basic Microsite UI** reference kit (`Basic Microsite UI/`) — a presentation-first, token-driven, dependency-free design system. Launched with one section (Pipeline Hub); additional sections slot in by adding a card to the greeter and new tab declarations in HTML.

---

## Design Foundation

All visual decisions inherit from `Basic Microsite UI/styles.css` and `Basic Microsite UI/app.js`. Do not deviate from these patterns — the entire value of the kit is that every block follows the same rules.

### Design Tokens (copy exactly from reference)

```css
:root {
  --purple:   #4B286D;
  --purple-d: #38205A;
  --purple-l: #63398B;
  --ink:      #2A1A3E;
  --green:    #66CC00;
  --lime:     #8FDD3D;
  --tint:     #F6F2FA;
  --tint2:    #F0EAF7;
  --line:     #E8E6EC;
  --line-d:   #D8D5DE;
  --grey:     #54505C;
  --grey-l:   #918A9C;
  --disp:     "Helvetica Neue", Arial, sans-serif;
  --text:     "Helvetica Neue", Arial, sans-serif;
  --micro:    "Helvetica Neue", Arial, sans-serif;
  --gut:      clamp(20px, 5vw, 72px);
  --navh:     72px;  /* overwritten by app.js on each render */
}
```

No external font loading. No CDN dependencies. The site must work on a projector with a locked-down TELUS laptop.

### Green usage rule

Green (`--green`) signals "this one" — the active tab underline, the hover accent on section cards. Use it **at most twice per screen**. Green everywhere signals nothing.

---

## Architecture

```
Greeter
  Panel 1 — Wordmark + context                (full viewport)
  Panel 2 — Section picker cards              (full viewport, dark bg)
      │
      └─→ Section: Pipeline Hub
              Tab: PSO One Pager
              Tab: Consolidated Billed Revenue
              Tab: BR Queries Pipeline
              Tab: Admin — Access Requests     (admin-only, hidden otherwise)
```

Three levels maximum. Future sections (e.g. GM Tracker, R&O Dashboard) add a card to Panel 2 and new tab declarations — no structural changes.

---

## Greeter

### Panel 1

| Element | Content |
|---------|---------|
| Wordmark | **EPB Team Site** (massive display type, clamp 96px → 24vw → 320px) |
| Sub-label | EPB Strategy & Planning |
| Context | Evergreen — no specific date or event |
| Chevron | Smooth-scrolls to Panel 2 |

Animates in with staggered `.up` keyframes (wordmark → sub-label → chevron). Must fit **1366×768 without scrolling** — check this first when editing Panel 1.

### Panel 2 — Section Picker

Dark background (`var(--ink)`). One section card to start; grid is fixed 5-column, responsive to 3-up then 1-up.

| # | Title | Blurb |
|---|-------|-------|
| 1 | Pipeline Hub | Live status across PSO One Pager, Consolidated Billed Revenue, and BR Queries pipelines |

Future sections slot into positions 2–5. Add a `<div class="ws-card" data-section="KEY">` and corresponding `#tabData` entries.

---

## Section 1 — Pipeline Hub

### Tab declarations (`#tabData`)

```html
<i data-section="pipeline" data-tab="pso"     data-label="PSO One Pager"></i>
<i data-section="pipeline" data-tab="cbr"     data-label="Billed Revenue"></i>
<i data-section="pipeline" data-tab="queries" data-label="BR Queries"></i>
<!-- Admin tab — removed from DOM by app.js if window.IS_ADMIN is false -->
<i data-section="pipeline" data-tab="admin"   data-label="Access Requests" data-admin="true"></i>
```

---

### Tab 1 — PSO One Pager

**Source:** `1wt1DgVwHxkDkTTFbJiFY6UQ_bEvs_sof_FNqDMl3pXA` → `PIPELINE_STATUS` tab

**Hero header:** dark background, eyebrow "PSO ONE PAGER", heading "Approval Pipeline", lede: current stage + percentage.

**Components used:**

| Block | Purpose |
|-------|---------|
| `.gstats` | Three stat tiles: Current Stage / Total Stages / % Complete |
| `.steps` ordered list | One step per pipeline stage — solid numbered square, status pill (`.pbadge`) per stage |
| `.gnote` callout | Shown only when status is WAITING or FAILED — blocker text. Hidden otherwise. At most one per page. |
| `.gcards` | "Open PSO Tracker →" link card |

**Status pill mapping (`.pbadge`):**

| Pipeline status | Pill class |
|----------------|-----------|
| COMPLETE | `.ok` (green) |
| IN_PROGRESS | `.info` (purple) |
| WAITING | `.warn` (yellow) |
| FAILED | `.bad` (red) |
| NOT_STARTED | `.todo` (dashed) |

---

### Tab 2 — Consolidated Billed Revenue

**Source:** `1_Pv9gOxUesAmgMlyngyIFIzQFVtlJktaHMU36vAZg7g` → `CONFIG` + `DATA_STATUS` tabs

**Hero header:** eyebrow "CONSOLIDATED BILLED REVENUE", heading "Monthly Submission Status", lede: current period.

**Components used:**

| Block | Purpose |
|-------|---------|
| `.gstats` | Three stat tiles: Current Period / Segments Complete / Segments Pending |
| `.gt` table | One row per segment — Segment, Status (`.pbadge`), Last Updated |
| `.gcards` | "Open CBR Tracker →" link card |

**Status → `.pbadge`:** COMPLETE → `.ok`, PENDING → `.todo`, PARTIAL → `.warn`

---

### Tab 3 — BR Queries Pipeline

**Source:** `19ioEbx2qjS74CIuvg95aS0_BzeLokXWkCL8bgEeBSzw` → `CONFIG` tab

**Hero header:** eyebrow "BR QUERIES PIPELINE", heading "Query Execution Status", lede: current period + stage.

**Components used:**

| Block | Purpose |
|-------|---------|
| `.steps` ordered list | 4 steps: Email Sent / Queries Run / Check / Done — active step `.info` pill, complete `.ok` pill |
| `.gt` table | One row per query/table — Name, Pass/Fail pill |
| `.gcards` | "Open Queries Tracker →" link card |

---

### Tab 4 — Access Requests (admin only)

Visible only when `window.IS_ADMIN === true`. `app.js` removes the `<i data-admin="true">` element from `#tabData` before building the nav bar if the flag is not set — the tab never appears for non-admins.

**Source:** `1OJpOFEwV0YaT1rUoygxXqypv5OwdDcBZX_q-_29Grug` (EPB Hub master) → `Access Requests` + `Admin - Access` tabs

**Hero header:** eyebrow "ADMIN", heading "Access Requests", lede: "Approve or deny EPB Hub access requests without opening the spreadsheet."

**Components used:**

| Block | Purpose |
|-------|---------|
| `.gstats` | One stat tile: Pending Requests count |
| `.gt` table | Email / Dashboard / Requested At / Action (Approve \| Deny buttons) |
| `.gnote` callout | Inline confirmation strip shown when Approve is clicked — replaces a modal overlay |

**Security:** `_isAdminUser()` re-checked server-side on every backend call. `window.IS_ADMIN` is display-only.

---

## Linked Assets (standalone — not embedded)

`gm-milestone-tracker/` and `ro-dashboard/` stay as independent HTML files. They are linked from section cards when those sections are added. They do not need to match this design system until they are rebuilt.

---

## File Structure

```
apps-script/
  Code.gs          ← backend (unchanged; two small additions below)
  index.html       ← full site shell (replaces Dashboard.html)
  styles.css       ← copied from Basic Microsite UI/styles.css
  app.js           ← copied from Basic Microsite UI/app.js + two additions
```

`styles.css` and `app.js` are included inline via the Apps Script `include()` helper:

```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

`Dashboard.html` is deprecated — delete once `index.html` is validated.

---

## Code.gs Changes (minimal)

All data functions (`_getPSOStatus`, `_getCBRStatus`, `_getQueriesStatus`, `_isAdminUser`, `getPendingAccessRequests`, `approveAccessRequest`, `denyAccessRequest`) are already implemented and unchanged.

**Two additions only:**

```javascript
// 1. File include helper
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 2. Update doGet to serve index.html
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('EPB Team Site')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

---

## index.html Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style><?!= include('styles') ?></style>
</head>
<body>

  <!-- Greeter -->
  <div id="greeter">
    <div class="gr-panel gr-one">
      <!-- wordmark, sub-label, chevron -->
    </div>
    <div class="gr-panel gr-two">
      <!-- section picker cards -->
    </div>
  </div>

  <!-- Tab declarations (hidden — read by app.js) -->
  <div id="tabData" hidden>
    <i data-section="pipeline" data-tab="pso"     data-label="PSO One Pager"></i>
    <i data-section="pipeline" data-tab="cbr"     data-label="Billed Revenue"></i>
    <i data-section="pipeline" data-tab="queries" data-label="BR Queries"></i>
    <i data-section="pipeline" data-tab="admin"   data-label="Access Requests" data-admin="true"></i>
  </div>

  <!-- Portal (hidden until section selected) -->
  <div id="portal" hidden>
    <nav class="nav"><!-- home button + tab row --></nav>
    <div id="view-pso"     class="tabview" hidden><!-- PSO content --></div>
    <div id="view-cbr"     class="tabview" hidden><!-- CBR content --></div>
    <div id="view-queries" class="tabview" hidden><!-- Queries content --></div>
    <div id="view-admin"   class="tabview" hidden><!-- Admin content --></div>
  </div>

  <button class="scroll-btn" hidden></button>

  <script><?!= include('app') ?></script>
  <script>
    // Server injects admin flag at render time
    // <?!= isAdmin ? 'window.IS_ADMIN=true;' : '' ?>

    // Remove admin tab if not admin (before nav bar is built)
    if (!window.IS_ADMIN) {
      var el = document.querySelector('#tabData i[data-admin]');
      if (el) el.parentNode.removeChild(el);
    }

    // Load pipeline data asynchronously
    google.script.run
      .withSuccessHandler(function(data) {
        renderPSO(data.pso);
        renderCBR(data.cbr);
        renderQueries(data.queries);
        if (data.isAdmin) renderAdmin();
      })
      .getDashboardData();
  </script>
</body>
</html>
```

---

## app.js Adaptations

Copy `Basic Microsite UI/app.js` verbatim. The `renderPSO()`, `renderCBR()`, `renderQueries()`, and `renderAdmin()` functions are added at the bottom and write component markup into the `.tabview` divs using blocks copied from `Basic Microsite UI/index.html`.

Each tab view starts with a loading skeleton (`.gstats` tiles with placeholder dashes). Data populates when the `google.script.run` response arrives — greeter and navigation are instant.

---

## Responsive Behaviour

Follow the reference kit breakpoints exactly:

| Viewport | Greeter cards | Tab bar | Components |
|----------|--------------|---------|-----------|
| ≥1180px | 5-column | full row | full layout |
| 760–1180px | 3-column | full row (may wrap) | 2-column grids |
| <760px | 1-column | hamburger drawer | stacked |

**Test priority:** 1366×768 first (projector fold), 1440×900, 1920×1080, 375×812.

---

## Component Reference Map

When building tab content, copy blocks from `Basic Microsite UI/index.html`. Do not invent new patterns.

| Need | Component |
|------|-----------|
| Big KPI number | `.gstats` stat tile |
| Status label | `.pbadge` pill (ok / warn / bad / info / todo) |
| Pipeline steps | `.steps` ordered list |
| Alert / blocker | `.gnote` callout (one per page max) |
| Data rows | `.gt` table with `.pbadge` in cells |
| Links to other tools | `.gcards` card |
| Numbered narrative | `.gbentos` prose cards |
| Progressive disclosure | `.swap` pill toggles |

---

## Setup Steps (once built)

1. Create a new Google Apps Script project named **"EPB Team Site"**
2. Add: `Code.gs`, `index.html`, `styles.css`, `app.js`
3. Authorize access to all source sheets on first run
4. Deploy as web app: Execute as **Me**, Access: **Anyone at TELUS**
5. Update `tracker.bat` (or share URL directly)

---

## Future Sections

| Section | Notes |
|---------|-------|
| GM Milestone Tracker | Rebuild existing `gm-milestone-tracker/` using component library |
| R&O Dashboard | Rebuild existing `ro-dashboard/` using component library |
| Additional pipelines | New tab → new render function → no structural changes |

Adding a section = one new greeter card + `#tabData` entries + `.tabview` divs + render function.
