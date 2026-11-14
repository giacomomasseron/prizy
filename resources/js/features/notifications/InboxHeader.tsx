import type { ReactNode } from 'react';

/**
 * The Inbox's page header (the design): the big display heading on the highlighter, one line under it, and the
 * page's controls on the right. The list view and the settings view both sit under it.
 */
export function InboxHeader({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
    return (
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', padding: '26px 32px 18px' }}>
            <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.05, color: 'var(--fg)' }}>
                    <span className="hl">{title}</span>
                </h1>
                <div style={{ marginTop: 8, fontSize: 15, fontWeight: 500, color: 'var(--fg3)' }}>{sub}</div>
            </div>
            {children && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{children}</div>}
        </header>
    );
}
