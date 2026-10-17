---
category: Overlays
---

The app's yes/no dialog. Mount `ConfirmProvider` once near the root; anywhere below it, `useConfirm()` returns an async `confirm(options)` that opens a small Modal (420px) and resolves `true` on the confirm button, `false` on Cancel, Escape or the backdrop. Options: `title` (required, the dialog's display-font heading), `message` (one line of detail), `confirmLabel` (default "Confirm"), `cancelLabel` (default "Cancel") and `danger` (a red confirm button, for deleting or disconnecting). Without a provider, `useConfirm()` falls back to the browser's `window.confirm`.

Use it instead of building a Modal for any "Are you sure?" step.

```jsx
// Once, around the app:
<ConfirmProvider>
  <App />
</ConfirmProvider>

// In any component below it:
const confirm = useConfirm();

async function onDelete() {
  if (!(await confirm({ title: 'Delete label "Bug"?', message: 'It is removed from every issue.', confirmLabel: 'Delete', danger: true }))) return;
  deleteLabel();
}

<Button variant="secondary" size="sm" onClick={onDelete}>Delete label</Button>
```
