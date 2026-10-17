import { IconButton } from '@prizy/ui';

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton title="Close">✕</IconButton>
        <IconButton title="More actions" size="md">⋯</IconButton>
    </div>
);

export const IssueToolbar = () => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '4px 8px', background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)' }}>
        <IconButton title="Previous issue">‹</IconButton>
        <IconButton title="Next issue">›</IconButton>
        <IconButton title="Star issue">☆</IconButton>
        <IconButton title="More actions">⋯</IconButton>
        <IconButton title="Close">✕</IconButton>
    </div>
);
