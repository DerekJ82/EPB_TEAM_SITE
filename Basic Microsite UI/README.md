# Microsite UI — reference build

A stripped-down version of a workshop microsite: a full-height greeter, a grid of
section cards, then a sticky tab bar with a library of content blocks.

**Everything here is placeholder copy.** Replace the text, keep the structure.

---

## Open it

Double-click `index.html`. No build step, no server, no dependencies, nothing to
install.

## Three files

| File | What it is |
|---|---|
| `styles.css` | All design tokens and components — **this is the reusable asset** |
| `index.html` | The shell and every block pattern, with placeholder copy |
| `app.js` | Navigation, tab wrapping, reveal-on-scroll, toggles |

There is deliberately no server-side file. In the original, content lives in a
Google Sheet and is rendered by an Apps Script backend — that is a deployment
choice, not part of the design. Here the content sits directly in the HTML so you
can wire up whatever backend you prefer, or none at all.

---

## Re-skinning it

Change the tokens at the top of `styles.css` and the whole site follows. Nothing
below `:root` carries a hard-coded colour.

```css
:root{
  --purple:#4B286D;   /* primary: headings, figures, table heads, active states */
  --ink:#2A1A3E;      /* body text, dark panels                                */
  --green:#66CC00;    /* accent: active markers. Use sparingly                  */
  --tint:#F6F2FA;     /* alternating section background                         */
  --gut:clamp(20px,5vw,72px);   /* the one horizontal gutter                    */
}
```

Fonts work the same way. Three roles — display, text, micro. Substitute the
families; keep the roles.

**Colour discipline matters more than the specific colours.** Purple carries
hierarchy, green means "this one" and appears at most twice per screen, grey does
everything else. Green used everywhere signals nothing.

---

## Structure

Three levels, and it is worth resisting a fourth.

```
greeter                    two full-height panels
  panel 1   wordmark, place and date, one question, scroll cue
  panel 2   one card per section

portal                     sticky tab bar + one panel per tab
  #view-why                a .tabview per tab key
  #view-data
  #view-process
  #view-blocks
```

### Navigation controls

| Control | Where | Behaviour |
|---|---|---|
| Section card | Greeter panel 2 | Opens that section on its first tab |
| Tab | Sticky bar | Switches the panel, scrolls to top |
| **← All sections** | Left end of the bar | Returns to the section picker |
| ← (arrow only) | Mobile bar | Same, icon-only to save width |
| Scroll button | Bottom-right, floating | See below |

The home control sits **outside** `#navRow` on purpose: `app.js` rebuilds that
row's `innerHTML` on every section change and would otherwise wipe it out.

### The scroll button does two jobs

One control, not two. It reads the page height and position:

| Situation | Shows |
|---|---|
| Long page, at the top | hidden |
| Long page, scrolled past 260px | ↑ Back to top |
| Long page, near the bottom | Next section → |
| **Short page** (under one viewport of scroll) | Next section → immediately |
| Last tab in the section | hidden |

That short-page rule is the non-obvious part. A page that scrolls by less than one
viewport never travels far enough to cross the reveal threshold, so the button
would stay hidden the whole way down. We hit exactly that on the real site — seven
tabs were affected before it was fixed.

### Adding a tab

Two edits:

1. A line in `#tabData`:
   ```html
   <i data-section="one" data-tab="risks" data-label="Managing Risk"></i>
   ```
2. A matching panel:
   ```html
   <div class="tabview" id="view-risks" hidden>...</div>
   ```

`app.js` builds the bar from that list, so the tab order is the list order and the
"Next section" button follows automatically.

**On single-tab sections:** sections 3, 4 and 5 in this build have one tab each, so
their bar renders a single tab — technically correct but a little pointless. Real
sections usually carry three to six tabs and it resolves itself. If a section
genuinely has one tab, consider hiding the bar for it.

---

## Block library

Open the **Block Library** tab in the browser to see them all rendered. Copy the
pattern you need from `index.html` and delete the rest.

| Block | Use it for |
|---|---|
| `.gcards` | Flexible card grid |
| `.gstats` | Big-figure stat tiles |
| `.ginsights` | 4-across bento: badge, header, figure + prose. `.hot` to highlight |
| `.gbentos` | 2×2 numbered prose cards |
| `.steps` | Numbered sequence |
| `.gexps` | Click-to-expand cards |
| `.split` | Two columns: themes left, figures right |
| `.pairs` | Two-column ranked list, name bold |
| `.gt` + `.swap` | Tables, and pill buttons revealing one at a time |
| `.imggrid` | 2×2 chart grid with footnotes |
| `.gbul` | Plain bullets |
| `.gnote` | The callout — at most one per page |
| `.deck` | Embed with a new-tab fallback |

### Three numbering devices — do not mix them in one block

- **Badge chip** (`.gi-badge`) — small tinted chip, top-left. Ranked findings.
- **Ghost numeral** (`.gbento-n`, `.spl-n`) — large digit at low opacity, rises on
  hover. Two to four peer items.
- **Step marker** (`.step-n`) — solid digit in a tinted square. Sequences.

---

## Things that will bite you

These come from building the real thing, and are the most useful part of this
folder.

**The greeter must fit the fold.** Verify at 1366×768 — the tightest realistic
laptop. If you add anything to that panel, check there first. Ours broke the moment
a logo and a date line were added.

**The tab bar wraps; it never truncates.** `app.js` detects the wrap, then
publishes the measured bar height as `--navh`. Content clearance and
`scroll-margin-top` both read that variable. A hardcoded clearance breaks the
moment the bar wraps onto a second row — verified working up to 10 tabs.

**Tables are the fragile part.** Figures stay `nowrap`; prose columns opt into
wrapping with `.gt-prose`. Tables of five or more columns get `.gt-wide` so the
header row wraps — that nowrap header is usually what pins a table too wide. Always
keep the `.gt-wrap` shell so a stubborn table scrolls inside its own box instead of
pushing the page sideways.

**Check hidden panes.** A table inside an unselected pane measures zero. Click
through every toggle before deciding a page is clean; overflow bugs hide there.

**Reduced motion must paint the end state**, not merely skip the animation, or
revealed content stays invisible. The same applies to background tabs:
`requestAnimationFrame` is suspended there, so `app.js` checks `document.hidden`
alongside the media query and takes the same immediate path.

**Embeds often refuse to be framed.** Many hosted documents send headers that
forbid it and the browser renders nothing. Always pair an embed with an
open-in-new-tab link, and prefer explaining the limitation on screen over leaving
an empty box that reads as a bug during a live session.

**A caption under a thumbnail must also appear in the expanded view.** A definition
visible in only one place is the one people ask about in the other.

**Section tints alternate.** If you build the stripe from an array index, a
headless "continuation" block will throw every following section out of phase and
you get two adjacent stripes of the same colour. Track it as a running counter that
only advances on a real section.

---

## Test viewports

In this order of importance:

| Viewport | Why |
|---|---|
| 1366 × 768 | Tightest realistic laptop — where things break first |
| 1440 × 900 | Most common working size |
| 1920 × 1080 | Projector and large display |
| 375 × 812 | Phone — must never scroll sideways |

---

## Design principles

Five rules explain most decisions here. When a choice is unclear, these break the
tie.

1. **Built to be presented, not browsed.** Every layout assumes a projector and a
   live audience. Generous type, high contrast, nothing that needs a second look.
2. **One idea per section.** One heading, one block. Alternating tints separate
   them so scrolling reads as a sequence of beats rather than a wall.
3. **Content is data, not markup.** Even here, blocks are patterns you fill rather
   than layouts you invent — which is what keeps a large site consistent.
4. **Restraint over decoration.** Two brand colours, one neutral ramp, three type
   roles, one accent used sparingly.
5. **Degrade honestly.** When something cannot work, say so on screen in plain
   language. Never leave an empty box that reads as a bug.

**The test:** open any page, stand two metres back, and read it. If you lean in,
the design failed, not the reader.
