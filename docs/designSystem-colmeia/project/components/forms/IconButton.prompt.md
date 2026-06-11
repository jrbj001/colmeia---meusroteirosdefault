Icon-only control for table row actions, toolbars and topbar chrome. Charcoal by default, scales + shifts toward brand orange on hover (`tone="danger"` shifts to red for delete actions).

```jsx
<IconButton icon="pin_drop" label="Ver no mapa" />
<IconButton icon="delete" tone="danger" label="Excluir" />
<IconButton icon="search" variant="outline" label="Buscar" />
```

`icon` takes a Material Symbols Outlined glyph name (load that font). Sizes `sm | md | lg`. Variants `bare | outline`.
