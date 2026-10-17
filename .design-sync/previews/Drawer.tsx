import type { ReactNode } from 'react';
import { Avatar, Button, Drawer, IconButton, PriorityIcon, PropertyRow, StatusIcon } from '@prizy/ui';

/** A fixed-position overlay covers the viewport; the transform makes this box its viewport, so the card holds it. */
function Stage({ children }: { children: ReactNode }) {
    return <div style={{ position: 'relative', width: 760, height: 520, transform: 'translateZ(0)', background: 'var(--bg)' }}>{children}</div>;
}

export function IssuePeek() {
    return (
        <Stage>
            <Drawer open onClose={() => {}} width={420} label="PRZ-244">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--fg3)' }}>PRZ-244</span>
                    <span style={{ marginLeft: 'auto' }} />
                    <Button variant="secondary" size="sm">Open full page</Button>
                    <IconButton title="Close">✕</IconButton>
                </div>
                <div style={{ padding: '18px 18px 10px' }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--fg)' }}>CSV export times out on large workspaces</h2>
                    <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--fg2)' }}>Exports over 50k tickets hit the 60-second limit. Two customers have escalated it from support.</p>
                </div>
                <div style={{ padding: '0 6px', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                    <PropertyRow label="Status"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="in_progress" decorative /> In Progress</span></PropertyRow>
                    <PropertyRow label="Priority"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="high" decorative /> High</span></PropertyRow>
                    <PropertyRow label="Assignee"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar initials="MC" color="#6d69f2" size={20} /> Maya Chen</span></PropertyRow>
                </div>
            </Drawer>
        </Stage>
    );
}
