import { Button, Kbd } from '@prizy/ui';

export const Keys = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg2)' }}>
        <Kbd>⌘K</Kbd>
        <Kbd>C</Kbd>
        <Kbd>esc</Kbd>
        <Kbd>↵</Kbd>
    </div>
);

export const InSearchField = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 300, padding: '8px 14px', background: 'var(--panel)', border: 'var(--line) solid var(--border2)', borderRadius: 'var(--radius-pill)', fontSize: 14, color: 'var(--fg3)' }}>
        <span style={{ flex: 1 }}>Search issues…</span>
        <Kbd>⌘K</Kbd>
    </div>
);

export const InButton = () => (
    <Button size="sm">
        + New issue <Kbd>C</Kbd>
    </Button>
);
