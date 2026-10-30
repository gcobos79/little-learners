# Changelog

## V6.0.0 — 2026-10-29 · in `beta/` (testing)
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
- Pending: test with the real account.

## V5.9.36 — 2026-10-29 · `index.html` (main site)
- Adds a "Little Learners · V5.9.36" label at the bottom of the page. Nothing else changed.

## V5.9.35 — stable reference
- Kept unchanged in `versions/LittleLearners_V5_9_35_stable.html`. Its latest internal note reads V5.9.34.
