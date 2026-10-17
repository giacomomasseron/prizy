---
category: Overlays
---

A centred dialog over a dimmed backdrop. It renders nothing while `open` is false. Escape and a click on the backdrop call `onClose`; focus is trapped inside while it is open. The panel is the v2 dialog: panel ground, 1.5px ink border, 20px radius, offset ink shadow; `width` defaults to 520 and caps at 92vw. Give it a `label` (the dialog's accessible name), usually the title.

Modal draws only the frame: lay the content out as a header (title + one-line subtitle), a body and a right-aligned footer, separated by 1px `var(--border)` rules.

```jsx
<Modal open={open} onClose={() => setOpen(false)} width={480} label="Create team">
  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
    <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em' }}>Create team</h2>
    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg2)' }}>Teams group issues, projects, and cycles.</p>
  </div>
  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
    <label htmlFor="team-name" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 }}>Team name</label>
    <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
  </div>
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
    <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
    <Button size="sm" onClick={create}>Create team</Button>
  </div>
</Modal>
```

For a yes/no question ("Delete this label?"), use `useConfirm()` from `ConfirmProvider` instead of building a Modal.
