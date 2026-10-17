---
category: Overlays
---

A full-height side panel over a dimmed backdrop, sliding in from the right (default) or the left. It renders nothing while `open` is false. Escape and a click on the backdrop call `onClose`; focus is trapped inside while it is open. The panel is panel-coloured with a 1.5px border on its inner edge and a 6px offset ink edge; `width` defaults to 520 and caps at 92vw. Give it a `label` (its accessible name). The panel is a scrolling flex column: lay the content out as a header row (an id or title, actions, a close `IconButton`), then the body.

The issue peek and the settings detail panels are Drawers.

```jsx
<Drawer open={!!issue} onClose={() => setIssue(null)} width={420} label={issue.ref}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--fg3)' }}>{issue.ref}</span>
    <span style={{ marginLeft: 'auto' }} />
    <Button variant="secondary" size="sm" onClick={openFullPage}>Open full page</Button>
    <IconButton title="Close" onClick={() => setIssue(null)}>✕</IconButton>
  </div>
  <div style={{ padding: 18 }}>
    <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>{issue.title}</h2>
  </div>
  <PropertyRow label="Status"><StatusIcon status={issue.status} decorative /> In Progress</PropertyRow>
</Drawer>
```
