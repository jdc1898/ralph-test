
## 2026-05-28

- Created `index.html` with semantic HTML structure: `<header>/<nav>`, `<main>` containing hero and features `<section>` elements with three feature `<article>` cards, and `<footer>`. All content from the spec (headline, subheading, CTA, card titles/descriptions, footer text) is in place. Links `style.css` for the next styling task.
- Created `style.css` with CSS reset, custom properties for `--color-bg: #0f172a`, `--color-text: #ffffff`, and `--color-accent: #6366f1`, applied to `body` and `a` as base styles.
- Implemented top navigation bar styles in `style.css`: `.nav` uses flexbox with `space-between` to pin the "Beacon" logo left and the "Get started" button right; `.btn`/`.btn-primary` provide the accent-colored pill button used in the nav.
- Implemented hero section styles in `style.css`: `.hero` centers content with flexbox and generous vertical padding; `.hero-headline` uses a fluid `clamp()` font-size (2.25rem–3.75rem) with tight letter-spacing; `.hero-subheading` mutes the text to 70% white opacity for visual hierarchy.
