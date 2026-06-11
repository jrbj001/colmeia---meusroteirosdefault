Feedback & overlay primitives — badges, status pills, loaders, modals and toasts.

```jsx
<Badge tone="success" dot>Finalizado</Badge>
<StatusBadge status="EM_ANALISE" />
<Spinner size={18} /> <Skeleton variant="card" />
<ConfirmDialog open={o} onClose={close} onConfirm={del}
  title="Confirmar Exclusão" message="Tem certeza que deseja excluir o roteiro:"
  highlight="Campanha Verão SP" confirmText="Excluir Roteiro" loading={deleting} />
<Toast tone="success" title="Roteiro excluído" message="A ação foi concluída." />
```

`Modal` is the generic shell; `ConfirmDialog` composes it with Buttons. Modal/Toast icons use Material Symbols Outlined — load that font.
