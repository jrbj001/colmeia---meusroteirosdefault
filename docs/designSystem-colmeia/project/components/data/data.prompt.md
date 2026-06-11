Data-display primitives — the operational table, its pagination, and user avatars.

```jsx
<DataTable
  columns={[
    { key: "nome", header: "Nome" },
    { key: "data", header: "Data de criação" },
    { key: "status", header: "Status", align: "center", render: (r) => <StatusBadge status={r.status} /> },
    { key: "acoes", header: "", align: "right", render: (r) => <IconButton icon="pin_drop" label="Mapa" /> },
  ]}
  rows={roteiros}
  loading={loading}
/>
<Pagination currentPage={page} totalPages={42} onPageChange={setPage} />
<Avatar name="Maria Souza" /> <Avatar src={photoUrl} name="Ana" />
```

`DataTable` renders a shimmer skeleton when `loading`, and `emptyMessage` when `rows` is empty. Pass `render` per column for badges, toggles and action icons.
