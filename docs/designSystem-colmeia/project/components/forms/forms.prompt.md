Form primitives — text fields, selects, toggles and checkboxes, all on an 8px radius with the brand-orange focus treatment.

```jsx
<Input label="Nome do roteiro" icon="search" placeholder="Buscar..." />
<Select label="Praça" placeholder="Todas" options={["São Paulo","Rio de Janeiro"]} />
<Switch checked={liberado} onChange={setLiberado} label="Liberar para agência" />
<Checkbox checked={sel} onChange={setSel} label="Selecionar todos" />
```

`Input` / `Select` take `error` to flip red. `icon` props use Material Symbols Outlined glyph names — load that font.
