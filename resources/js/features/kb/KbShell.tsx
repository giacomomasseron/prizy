import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { BrandMark } from '../../components/ui/BrandMark';
import { avatarFor } from '../../lib/avatarFor';

// Layout only: rail colours live in classes so the hover can change them.
const railIcon: CSSProperties = { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' };
const RAIL_CLASSES = 'text-fg3 hover:bg-hover hover:text-fg';

export function KbShell({ children }: { children: ReactNode }) {
    const me = useMe();
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            {/* icon rail */}
            <div style={{ width: 56, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6 }}>
                <Link to="/support" aria-label="Prizy" style={{ display: 'inline-flex', borderRadius: '50%', marginBottom: 8 }}>
                    <BrandMark size={32} />
                </Link>
                <Link to="/support" title="Desk" aria-label="Desk" className={RAIL_CLASSES} style={railIcon}>⌂</Link>
                <Link to="/support/reporting" title="Reporting" aria-label="Reporting" className={RAIL_CLASSES} style={railIcon}>📊</Link>
                <Link to="/support/kb" title="Knowledge base" aria-label="Knowledge base" aria-current="page" className="bg-sup2 text-sup" style={railIcon}>📚</Link>
                <div style={{ flex: 1 }} />
                <Link
                    to="/"
                    title="Switch to Engineering"
                    aria-label="Switch to Engineering"
                    className="border-border2 text-fg3 hover:border-accent hover:text-accent"
                    style={{ ...railIcon, borderWidth: 'var(--line)', borderStyle: 'solid' }}
                >
                    ⌗
                </Link>
                {me.data && <span style={{ marginTop: 6 }}><Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={30} /></span>}
            </div>

            <main style={{ flex: 1, minWidth: 640, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>{children}</main>
        </div>
    );
}
