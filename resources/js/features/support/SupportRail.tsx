import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { BrandMark } from '../../components/ui/BrandMark';
import { avatarFor } from '../../lib/avatarFor';

/** A rail item (link or button; Tailwind's preflight already zeroes button borders). Layout only: colours live in
 *  RAIL_ITEM_CLASSES / RAIL_ACTIVE_CLASSES so the hover works. */
export const railItem: CSSProperties = {
    width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, textDecoration: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
};
export const RAIL_ITEM_CLASSES = 'bg-transparent text-fg3 hover:bg-hover hover:text-fg';
export const RAIL_ACTIVE_CLASSES = 'bg-sup2 text-sup-ink';

/**
 * The support product's icon rail (desk, reporting, KB): the ink brand, the surface's own items,
 * then "Switch to Engineering" and the signed-in user.
 */
export function SupportRail({ children }: { children: ReactNode }) {
    const me = useMe();
    return (
        <div style={{ width: 56, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'calc(12px + var(--nav-inset, 0px))', paddingBottom: 12, gap: 6 }}>
            <Link to="/support" aria-label="Prizy" style={{ display: 'inline-flex', borderRadius: '50%', marginBottom: 8 }}>
                <BrandMark size={32} />
            </Link>
            {children}
            <div style={{ flex: 1 }} />
            <Link
                to="/"
                title="Switch to Engineering"
                aria-label="Switch to Engineering"
                className="border-border2 text-fg3 hover:border-accent hover:text-accent"
                style={{ ...railItem, borderWidth: 'var(--line)', borderStyle: 'solid' }}
            >
                ⌗
            </Link>
            {me.data && <span style={{ marginTop: 6 }}><Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={30} /></span>}
        </div>
    );
}
