# Changelog

## V6.1.0 — 2026-10-29 · `index.html` (main site)
More colorful Evaluar screen, based on the owner's reference design. **The original JavaScript is still unchanged, byte for byte.**

### Look
- Cream background with letters and shapes, only in the margins.
- Top bar: colored icons on each tab, the month selector with a colored border, and a logo with a wand.
- Students panel: rainbow border.
- **Gauge** showing how many students have done the selected assessment (e.g. 13/14).

### Fields
- Micro-icons in the fields: ABC (area), globe (language), Aa (type), clock (time), bolt (counting speed).
- «Reevaluar» is a switch.
- The selected student's initials appear next to «Comenzar evaluación», which uses a cyan→indigo→purple gradient.

### Student cards
- Solid **green** for evaluated and **coral with a dashed border** for pending.
- The **selected** student uses the same gradient as «Comenzar evaluación», is slightly enlarged, and has a yellow ring.
- **Monthly progress ring** around each student's initials: one segment per assessment applied that month to the class.
  - 100 % = every assessment (area + language + type) applied that month to at least one active student.
  - Calculated from data already loaded; nothing is written to Supabase.

### Testing
- Regression: 104/104 identical results vs V5.9.35, no errors.
- Ring checks (`tests/test_ring.js`): October, September, an empty month, and recalculation after saving a new assessment.

## V6.0.0 — 2026-10-29 · previous main site
Visual redesign and reorganization. **The original JavaScript (assessments, saving, reports, Supabase) is unchanged, byte for byte.**

### Layout
- Fixed top bar with four modules: **Evaluar · Reportes · Mi clase · Configuración**.
  - The **working month** selector moved to the top bar. Reports no longer depend on the Evaluar screen.
  - New **Salir** (log out) button, which clears only this device's session.
- **Evaluar** follows a step-by-step flow: ① what to evaluate → ② which student → Start, with the selected student shown next to the button.
  - A tip explains the long-press menu (view or delete an assessment).
- The top bar hides **during an assessment**. The letter font and size are unchanged.

### Visual design
- Colors: indigo primary, sunflower accent, mint for evaluated, coral for pending.
- Fonts: Plus Jakarta Sans and Fredoka (Google Fonts, with a system-font fallback).
- Line icons throughout, and a new login screen.

### Printing
- The report printout is unchanged.

### Testing
- Same automated walkthrough on V5.9.35 and V6.0.0, desktop and tablet, using simulated Supabase: **104/104 identical results**, no errors.
- Published directly to the main site at the owner's request. V5.9.36 is still available in `versions/` for rollback.

## V5.9.36 — 2026-10-29 · previous main site
- Adds a "Little Learners · V5.9.36" label at the bottom of the page. Nothing else changed.

## V5.9.35 — stable reference
- Kept unchanged in `versions/LittleLearners_V5_9_35_stable.html`. Its latest internal note reads V5.9.34.
