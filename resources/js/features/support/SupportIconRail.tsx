import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import type { CSSProperties } from 'react';

const railBtn = (active: boolean): CSSProperties => ({ width: 38, height: 38, borderRadius: 10, border: 'none', background: active ? 'var(--sup2)' : 'transparent', color: active ? 'var(--sup)' : 'var(--fg3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' });

export function SupportIconRail({ viewsOpen, onToggleViews, onNewTicket }: { viewsOpen: boolean; onToggleViews: () => void; onNewTicket: () => void }) {
    const me = useMe();
    return (
        <div style={{ width: 56, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--sup),#5cc78c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 }}>P</div>
            <button type="button" title="Home" aria-label="Home" style={railBtn(true)}>⌂</button>
            <button type="button" title="Views" aria-label="Views" onClick={onToggleViews} style={railBtn(viewsOpen)}>▤</button>
            <button type="button" title="New ticket" aria-label="New ticket" onClick={onNewTicket} style={railBtn(false)}>＋</button>
            <Link to="/support/reporting" title="Reporting" aria-label="Reporting" style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--fg3)', textDecoration: 'none' }}>📊</Link>
            <div style={{ flex: 1 }} />
            <Link to="/" title="Switch to Engineering" aria-label="Switch to Engineering" style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--fg3)', border: '1px solid var(--border2)', textDecoration: 'none' }}>⌗</Link>
            {me.data && <span style={{ marginTop: 6 }}><Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={30} /></span>}
        </div>
    );
}
