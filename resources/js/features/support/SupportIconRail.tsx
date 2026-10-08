import { Link } from 'react-router-dom';
import { RAIL_ACTIVE_CLASSES, RAIL_ITEM_CLASSES, SupportRail, railItem } from './SupportRail';

export function SupportIconRail({ viewsOpen, onToggleViews, onNewTicket }: { viewsOpen: boolean; onToggleViews: () => void; onNewTicket: () => void }) {
    return (
        <SupportRail>
            <button type="button" title="Home" aria-label="Home" className={RAIL_ACTIVE_CLASSES} style={railItem}>⌂</button>
            <button type="button" title="Views" aria-label="Views" aria-pressed={viewsOpen} onClick={onToggleViews} className={viewsOpen ? RAIL_ACTIVE_CLASSES : RAIL_ITEM_CLASSES} style={railItem}>▤</button>
            <button type="button" title="New ticket" aria-label="New ticket" onClick={onNewTicket} className={RAIL_ITEM_CLASSES} style={railItem}>＋</button>
            <Link to="/support/reporting" title="Reporting" aria-label="Reporting" className={RAIL_ITEM_CLASSES} style={railItem}>📊</Link>
            <Link to="/support/kb" title="Knowledge base" aria-label="Knowledge base" className={RAIL_ITEM_CLASSES} style={railItem}>📚</Link>
        </SupportRail>
    );
}
