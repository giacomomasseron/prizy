import { Button } from '@prizy/ui';

export const Variants = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Button>Create issue</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="ghost">Load older</Button>
        <Button variant="danger">Delete label</Button>
    </div>
);

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Button size="sm">Add label</Button>
        <Button size="md">Create team</Button>
        <Button variant="secondary" size="sm">Export CSV</Button>
        <Button variant="secondary" size="md">Create another</Button>
    </div>
);

export const Disabled = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Button disabled>Send</Button>
        <Button variant="secondary" size="sm" disabled>Load older messages</Button>
    </div>
);

export const DialogFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, width: 360, padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--panel)' }}>
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button size="sm">Create team</Button>
    </div>
);

export const FullWidthSubmit = () => (
    <div style={{ width: 360 }}>
        <Button type="submit" style={{ width: '100%', height: 50, fontSize: 16 }}>Email me my workspaces</Button>
    </div>
);
