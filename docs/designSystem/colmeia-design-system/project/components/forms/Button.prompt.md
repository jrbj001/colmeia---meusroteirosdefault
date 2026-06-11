Primary action control for Colmeia — use for any button; brand-orange `primary` for the main action on a view, `secondary` outline for cancel/neutral, `ghost` for low-emphasis, `danger` for destructive confirms.

```jsx
<Button variant="primary" onClick={save}>Criar roteiro</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="danger" loading={deleting}>Excluir</Button>
```

Variants: `primary | secondary | ghost | danger`. Sizes: `sm | md | lg`. Props: `loading` (spinner), `fullWidth`, `iconLeft`, `iconRight`, `disabled`. Labels render in the brand font.
