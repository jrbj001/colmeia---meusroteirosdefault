# Colmeia Design System

A design system for **Colmeia** — a web SaaS platform for **OOH (out-of-home) media planning** built by **Be Mediatech (Be180)**. The product covers route creation ("roteiros"), media inventory, interactive maps, reports and admin workflows. UI language is **Brazilian Portuguese**.

This system formalizes the visual language already present in the live application: tokens, components and full-screen recreations that make the product more consistent, scalable, accessible and implementation-ready. The implementation target is **React + TypeScript + Tailwind CSS**, so tokens are expressed on a Tailwind-compatible scale.

---

## Sources

Built by reading the production codebase. If you have access, explore these to design with higher fidelity:

- **GitHub:** `jrbj001/colmeia---meusroteirosdefault` — https://github.com/jrbj001/colmeia---meusroteirosdefault
  React (Vite + TS) frontend, Vercel serverless API, Leaflet maps, SQL Server / PostgreSQL / Databricks data. Key references used: `src/components/Sidebar`, `Topbar`, `Modal`, `ConfirmDeleteModal`, `Avatar`, `SkeletonLoader`, `src/screens/MeusRoteiros`, `HomeDashboard`, `AdminInventarios/components/StatusBadge`, and `tailwind.css`.

> ⚠️ The codebase's `tailwind.css` carries a leftover **Anima-exported** grey "brand-800/900" token set. That is **NOT canonical** — it is dead Anima scaffolding. The orange **#FF4600** identity rendered throughout the live UI is the source of truth, and this system encodes that.

---

## Content fundamentals

How Colmeia writes copy:

- **Language:** Brazilian Portuguese, always. Sentence case for labels and buttons ("Criar roteiro", "Limpar filtros", "Ver no mapa"); UPPERCASE only for table headers and small section labels ("RELATÓRIOS", "CADASTRAR", "BANCO DE ATIVOS").
- **Voice:** operational, direct, second-person-implicit. Instructions read as plain imperatives ("Buscar por nome do roteiro...", "Importar nova base"). No marketing flourish, no exclamation in chrome.
- **Tone:** precise and reassuring. Status is stated plainly — "Processando", "Finalizado", "Atualizando automaticamente". Destructive actions are explicit and calm: *"Tem certeza que deseja excluir o roteiro: «nome». Esta ação não poderá ser desfeita."*
- **Domain vocabulary:** roteiro (media route/plan), praça (market/city), exibidor (media owner/operator), agência, ponto (inventory point/face), passantes (footfall), indoor / vias públicas (VP), cobertura, frequência, GRP, impactos, semanas.
- **Numbers:** Brazilian formatting — `1.284`, `48,6M`, `64,2%`. IDs, coordinates and counts in monospace.
- **Emoji:** essentially none in product chrome. (A couple of dev-era `alert()` strings used 🚧/✅, but that is not the design language — do not introduce decorative emoji.)
- **Footer, verbatim:** *"© 2026 Colmeia. All rights are reserved to Be Mediatech OOH."* — small, italic, muted grey.

---

## Visual foundations

**Character.** A professional operational dashboard — dense, clear, precise, built for repeated daily use. Clean, flat, **light theme**. Not a marketing site, not decorative.

- **Color.** Brand orange **#FF4600** (hover/pressed **#E33D00**) for primary buttons, active nav, key accents and focus. Charcoal **#3A3A3A** core text, **#222** for strong headings. Operational surfaces are white and light grey (`#FFFFFF`, `#FAFAFA`, `#F8F8F8`, `#F7F7F7`) over a neutral ramp for dividers/borders/secondary text (`#EDEDED → #D9D9D9 → #C1C1C1 → #B0B0B0 → #757575`). The data-table header is dark charcoal **#393939**. Semantic colors follow Tailwind defaults — green `#15803D/#DCFCE7`, amber `#B45309/#FEF3C7`, red `#DC2626/#B91C1C`, neutral `#374151/#F3F4F6`.
  *Legacy note:* the live app drifted to amber `#FF9800` in a few focus rings and toggles; this system unifies those onto the brand orange.
- **Type.** **Neue Montreal** (Regular/Medium/Bold) is the brand/UI font — headings, navigation, table chrome, labels. **Inter** is the body/secondary family. A **monospace** stack is reserved for technical/tabular data (IDs, coordinates, counts). Small UI text carries ~0.5px letter-spacing; section labels and table headers are UPPERCASE with wider tracking. *(Neue Montreal is proprietary; this system substitutes **Hanken Grotesk** from Google Fonts — see Caveats.)*
- **Shape & surfaces.** Default radius **8px** (`rounded-lg`) for cards, inputs and buttons; **12–16px** for panels, KPI cards and modals; **full** for avatars, badges, pills and toggles. Cards are white with a 1px `#EDEDED`/`#C1C1C1` border and a **subtle** shadow (`shadow-sm`); stronger shadows are reserved for modals and overlays.
- **Backgrounds.** Flat fills only — no gradients on surfaces (the one gradient is the orange avatar fill, `#FF8B5E → #E33D00`). No imagery, textures or patterns in chrome. Maps (Leaflet, CARTO light basemap) carry color via translucent hexagon/circle overlays.
- **Borders & dividers.** Hairline 1px. `#C1C1C1` for structural chrome (sidebar edge, topbar underline, vertical rails), `#EDEDED`/`#E5E5E5` for soft in-card dividers and zebra separation.
- **Animation.** Restrained and functional. `transition-colors` at **200ms** on hover/active; sidebar collapse at **300ms** `cubic-bezier(0.4,0,0.2,1)`; a **2s** shimmer sweep on skeletons; spinners spin at ~0.7–0.8s; processing dots use a gentle 1.5s pulse. No bounces, no decorative looping motion on content.
- **Hover / press.** Buttons darken (orange → `#E33D00`). Nav items and icon buttons shift background to `#EDEDED` and text/icon from `#757575` → `#222`. Action icons scale to **1.06–1.1×** and adopt the brand orange (or red for delete). Table rows lift to `#ECECEC`.
- **Focus.** Brand-orange ring — a 1px orange border plus a soft `#FFF1EB` 3px glow on inputs.
- **Transparency / blur.** Sparingly: modal backdrops are `rgba(0,0,0,0.45)` with a slight `blur(2px)`; map overlays use low fill-opacity.
- **Layout.** Fixed sidebar (256px, collapses to 80px icon-only) + fixed topbar (72px) + scrollable content + pinned footer. Content padding is 24px (`px-6`).

See the **Design System** tab for live specimen cards (colors, type, spacing, radius, elevation, logo, iconography).

---

## Iconography

- **System:** **Material Symbols (Outlined)** — Google's Material Design icon set. The codebase ships hand-coded SVG React wrappers of Material glyphs (`PinDrop`, `AddBox`, `FindInPage`, `Difference`, `Search`, `Style`, `Delete`, `CheckCircle`, `ExitToApp`, `KeyboardArrowDown`). A handful of one-off inline strokes (home, settings-gear, list) are also Material-style.
- **In this system:** rather than redistribute the hand-coded SVGs, components and cards load **Material Symbols Outlined from the Google Fonts CDN** and reference glyphs by name (`pin_drop`, `add_box`, `find_in_page`, `difference`, `search`, `delete`, `check_circle`, `logout`, `keyboard_arrow_down`, `map`, `settings`). Weight 400, optical size 24, unfilled. Use `currentColor` so icons inherit text color and hover transitions.
- **Sizing:** 18–20px inline / in controls, 24px in the topbar, ~26px in table-row actions. Stroke-style (outlined), never filled, to match the app.
- **Emoji / unicode as icons:** not used. Stick to Material Symbols.
- **Load it:** `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />`

---

## Index / manifest

**Root**
- `styles.css` — global entry point (imports only). Consumers link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills front-matter for Claude Code.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css` (spacing, radius, shadow, motion, z-index).

**`assets/`** — `logo-colmeia-full.png` (lockup: hexagon + "Colmeia" + "Be Mediatech OOH"), `logo-colmeia-mark.png` (honeycomb pin mark). Keep the logo untouched.

**`guidelines/`** — foundation specimen cards: brand/neutral/semantic/surface colors, brand/body/mono type, spacing scale, radius, elevation, logo, iconography.

**`components/`** — reusable React primitives (load via `_ds_bundle.js`, namespace `window.ColmeiaDesignSystem_6ed06a`):
- `forms/` — **Button, IconButton, Input, Select, Switch, Checkbox**
- `feedback/` — **Badge, StatusBadge, Spinner, Skeleton, Modal, ConfirmDialog, Toast**
- `data/` — **DataTable, Pagination, Avatar**
- `navigation/` — **Sidebar, Topbar, Tabs**

**`ui_kits/colmeia-app/`** — interactive recreation of the app: **Meus Roteiros** (data table) and **Home Dashboard**, in a fixed sidebar/topbar shell. Open `index.html`.

---

## Caveats

- **Fonts substituted.** Neue Montreal (proprietary, was loaded from Anima's S3 in the app) is replaced with **Hanken Grotesk** (Google Fonts) as the brand font, and the system mono stack stands in for any branded mono. To restore exact brand type, drop the real `.otf`/`.woff2` files in `tokens/` and update `tokens/fonts.css`.
- **Icons via CDN.** Material Symbols Outlined is linked from Google Fonts CDN rather than self-hosted.
- The "brand-800/900" grey tokens from the codebase are intentionally excluded as non-canonical Anima leftovers.
