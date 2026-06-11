# Colmeia App — UI Kit

High-fidelity recreation of the **Colmeia 2.0** operational web app (OOH media planning), reconstructed from the `jrbj001/colmeia---meusroteirosdefault` codebase.

## Screens
- **Meus Roteiros** (`MeusRoteiros.jsx`) — the signature table/dashboard: dark-header data table, zebra rows, live search, per-row status select, "liberar para agência" toggle, processing indicator, row actions (map / results / delete), delete confirmation modal, and pagination.
- **Home Dashboard** (`HomeDashboard.jsx`) — consolidated OOH indicators: Health Score gauge with weighted dimensions, KPI cards, Top Praças / Top Exibidores rankings, and the roteiros pipeline.
- **AppShell** (`AppShell.jsx`) — fixed sidebar + topbar (breadcrumb, user, logout) + scrollable content + footer. Switches screens via sidebar nav.

## Run
Open `index.html`. It is an interactive click-through — navigate via the sidebar; routes not yet built show an "em desenvolvimento" placeholder (matching the real app's `PaginaEmDesenvolvimento`).

## Composition
Screens are built almost entirely from design-system primitives (`Sidebar`, `Topbar`, `DataTable`, `Pagination`, `StatusBadge`, `Switch`, `Input`, `Select`, `Button`, `Badge`, `ConfirmDialog`, `Spinner`, `IconButton`) loaded from `_ds_bundle.js`. Only layout glue and the Health Score gauge are kit-local.

> Data is mock/seed. The original app is React + TypeScript + Tailwind on Vercel serverless, with Leaflet maps, SQL Server / PostgreSQL and Databricks behind the scenes — not reproduced here.
