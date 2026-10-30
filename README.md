# Little Learners ✨
Early Learning Assessment System — developed by Geovanny Cobos.

A web app for monthly Pre-K assessments (letters, numbers, shapes, colors, phonological skills…) with reports per student and per class. Student data is stored in Supabase behind the teacher's login. **No student data is stored in this repository.**

## What is where
| Path | What it is | Live address |
|---|---|---|
| `index.html` | **Main site.** The version used in class. Currently **V6.1.0**. | `https://gcobos79.github.io/little-learners/` |
| `versions/` | Every released version, kept unchanged so you can always go back. | — |
| `tests/` | Automated tests that run the whole app against a *simulated* Supabase (fake data, never the real database). | — |

## Versions
See [CHANGELOG.md](CHANGELOG.md).

- **Stable reference:** `versions/LittleLearners_V5_9_35_stable.html`. Never edit it.

## How changes are made
1. Each change is saved as a **new version number** in `versions/`. Older versions are never overwritten.
2. Before publishing, the whole app is tested automatically against a simulated Supabase and compared with the previous version.
3. The new version then replaces `index.html` and goes live right away. If anything goes wrong, the previous version is restored from `versions/`.

## Rolling back
To go back to an earlier version, copy the file you want from `versions/` over `index.html` and commit. Example: `versions/LittleLearners_V5_9_35_stable.html` → `index.html`.

Student data lives in Supabase, not in these files, so switching the HTML version never deletes or changes data.

## Security notes
- The HTML contains the Supabase project URL and the **publishable** key. These are designed to be public. Data protection comes from the teacher login and Supabase Row Level Security (RLS).
- Never put a Supabase **service_role** key, passwords, or student lists in this repository.

## Running the tests
The tests need Node and Playwright:

```
node tests/test_ll_functional.js <file.html> <old|new> <results.json> [screenshots-folder]
```

Use `old` for V5.x files and `new` for V6+ files. All Supabase traffic is answered by `tests/mock_supabase.js`.
