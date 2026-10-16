import { Link } from 'react-router-dom';
import { RAIL_ACTIVE_CLASSES, RAIL_ITEM_CLASSES, SupportRail, railItem } from './SupportRail';

/** No onNewTicket, no New ticket button: a viewer reads the desk but cannot open tickets. */
export function SupportIconRail({ viewsOpen, onToggleViews, onNewTicket }: { viewsOpen: boolean; onToggleViews: () => void; onNewTicket?: () => void }) {
    return (
        <SupportRail>
            {/* V2-G3b: Home is the desk itself — a real link, marked as the current page (it used to do nothing). */}
            <Link to="/support" title="Home" aria-label="Home" aria-current="page" className={RAIL_ACTIVE_CLASSES} style={railItem}>⌂</Link>
            <button type="button" title="Views" aria-label="Views" aria-pressed={viewsOpen} onClick={onToggleViews} className={viewsOpen ? RAIL_ACTIVE_CLASSES : RAIL_ITEM_CLASSES} style={railItem}>▤</button>
            {onNewTicket && <button type="button" title="New ticket" aria-label="New ticket" onClick={onNewTicket} className={RAIL_ITEM_CLASSES} style={railItem}>＋</button>}
            <Link to="/support/reporting" title="Reporting" aria-label="Reporting" className={RAIL_ITEM_CLASSES} style={railItem}>📊</Link>
            <Link to="/support/kb" title="Knowledge base" aria-label="Knowledge base" className={RAIL_ITEM_CLASSES} style={railItem}>📚</Link>
        </SupportRail>
    );
}
