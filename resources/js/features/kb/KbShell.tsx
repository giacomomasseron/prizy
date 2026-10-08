import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RAIL_ACTIVE_CLASSES, RAIL_ITEM_CLASSES, SupportRail, railItem } from '../support/SupportRail';

export function KbShell({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <SupportRail>
                <Link to="/support" title="Desk" aria-label="Desk" className={RAIL_ITEM_CLASSES} style={railItem}>⌂</Link>
                <Link to="/support/reporting" title="Reporting" aria-label="Reporting" className={RAIL_ITEM_CLASSES} style={railItem}>📊</Link>
                <Link to="/support/kb" title="Knowledge base" aria-label="Knowledge base" aria-current="page" className={RAIL_ACTIVE_CLASSES} style={railItem}>📚</Link>
            </SupportRail>

            <main style={{ flex: 1, minWidth: 640, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>{children}</main>
        </div>
    );
}
