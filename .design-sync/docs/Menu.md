---
category: Overlays
---

A dropdown of actions or options, opened by the element you pass as `trigger`. Menu clones the trigger to add the click handler and `aria-haspopup`/`aria-expanded`, so pass a real button (a `Button`, an `IconButton`, or a native `<button>`). The popover is the v2 pop: panel ground, 1.5px ink border, offset ink shadow, 16px radius. It closes on a pick (unless `selection="multi"`), an outside click, Escape or Tab; arrow keys, Home/End and Enter work inside it.

Each item is `{ key, label, onActivate }`, plus optional `subtitle` (second line), `icon` (16px slot on the left), `danger` (red text), `disabled` (dimmed, skipped by the keyboard) and `checked` (a ✓ when `selection` is set).

```jsx
<Menu
  placement="bottom-start"
  trigger={<Button variant="secondary" size="sm">Open ▾</Button>}
  items={[
    { key: 'open', label: 'Open', onActivate: () => setStatus('open') },
    { key: 'pending', label: 'Pending', onActivate: () => setStatus('pending') },
    { key: 'solved', label: 'Solved', onActivate: () => setStatus('solved') },
  ]}
/>
```

A row's ⋯ actions, with a destructive last item:

```jsx
<Menu
  placement="bottom-end"
  trigger={<IconButton title="More actions">⋯</IconButton>}
  items={[
    { key: 'edit', label: 'Edit label', onActivate: onEdit },
    { key: 'delete', label: 'Delete label', danger: true, onActivate: onDelete },
  ]}
/>
```

A picker with a current value and a filter box:

```jsx
<Menu
  selection="single"
  searchable
  searchPlaceholder="Assign to…"
  trigger={<Button variant="secondary" size="sm">Maya Chen ▾</Button>}
  items={people.map((p) => ({ key: p.id, label: p.name, subtitle: p.email, checked: p.id === assigneeId, onActivate: () => assign(p.id) }))}
/>
```
