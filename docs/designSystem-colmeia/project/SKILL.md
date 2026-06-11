---
name: colmeia-design
description: Use this skill to generate well-branded interfaces and assets for Colmeia (Be Mediatech's OOH media-planning web platform), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference
- **Primary:** orange `#FF4600` (hover `#E33D00`). **Text:** `#3A3A3A` body, `#222` headings, `#757575` secondary.
- **Surfaces:** white / `#FAFAFA` / `#F8F8F8` (sidebar) / `#F7F7F7` (zebra). Borders `#EDEDED` → `#C1C1C1`. Table header dark `#393939`.
- **Semantic:** green `#15803D/#DCFCE7`, amber `#B45309/#FEF3C7`, red `#DC2626/#B91C1C`.
- **Type:** Neue Montreal (→ Hanken Grotesk) for brand/UI; Inter for body; monospace for IDs/coords/counts. 0.5px tracking on small UI text.
- **Shape:** 8px radius default; 12–16px panels/modals; full for pills/avatars. Subtle shadows. Flat, light theme.
- **Icons:** Material Symbols Outlined (`<link>` from Google Fonts CDN), referenced by glyph name, `currentColor`.
- **Language:** Brazilian Portuguese. Operational, direct, calm.

## Files
- `styles.css` — link this for all tokens + fonts.
- `tokens/` — colors, typography, spacing/radius/shadow/motion, fonts.
- `assets/` — Colmeia logo (full lockup + mark). Keep untouched.
- `components/` — React primitives (Button, Input, DataTable, Sidebar, Modal, StatusBadge, …); load `_ds_bundle.js` and read from `window.ColmeiaDesignSystem_<id>`.
- `ui_kits/colmeia-app/` — interactive app recreation (Meus Roteiros, Dashboard).
- `guidelines/` — specimen cards.

When building standalone HTML, copy the logo from `assets/` and link Material Symbols + the Google Fonts for Hanken Grotesk / Inter (already imported by `styles.css`).
