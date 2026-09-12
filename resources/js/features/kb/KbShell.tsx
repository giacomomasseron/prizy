import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';

const railIcon: CSSProperties = { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--fg3)', textDecoration: 'none' };

export function KbShell({ children }: { children: ReactNode }) {
    const me = useMe();
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            {/* icon rail */}
            <div style={{ width: 56, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6 }}>
                <Link to="/support" style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--sup),#5cc78c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8, textDecoration: 'none' }}>P</Link>
                <Link to="/support" title="Desk" aria-label="Desk" style={railIcon}>⌂</Link>
                <Link to="/support/reporting" title="Reporting" aria-label="Reporting" style={railIcon}>📊</Link>
                <Link to="/support/kb" title="Knowledge base" aria-label="Knowledge base" style={{ ...railIcon, background: 'var(--sup2)', color: 'var(--sup)' }}>📚</Link>
                <div style={{ flex: 1 }} />
                <Link to="/" title="Switch to Engineering" aria-label="Switch to Engineering" style={{ ...railIcon, border: '1px solid var(--border2)' }}>⌗</Link>
                {me.data && <span style={{ marginTop: 6 }}><Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={30} /></span>}
            </div>

            <main style={{ flex: 1, minWidth: 640, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>{children}</main>
        </div>
    );
}
