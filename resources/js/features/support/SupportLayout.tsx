import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { useTickets } from './hooks';
import { filterByView, type TicketViewKey } from './ticketViews';
import { SupportIconRail } from './SupportIconRail';
import { SupportViewsSidebar } from './SupportViewsSidebar';
import { TicketList } from './TicketList';
import { TicketConversation } from './TicketConversation';
import { TicketContext } from './TicketContext';
import { NewTicketModal } from './NewTicketModal';

export default function SupportLayout() {
    const me = useMe();
    const navigate = useNavigate();
    const { id } = useParams();
    const [view, setView] = useState<TicketViewKey>('mine');
    const [viewsOpen, setViewsOpen] = useState(true);
    const [newOpen, setNewOpen] = useState(false);
    const ticketsQ = useTickets();
    const all = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
    const shown = useMemo(() => filterByView(all, view, me.data?.id), [all, view, me.data?.id]);
    const selectedId = id ?? shown[0]?.id;

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <SupportIconRail viewsOpen={viewsOpen} onToggleViews={() => setViewsOpen((o) => !o)} onNewTicket={() => setNewOpen(true)} />
            {viewsOpen && <SupportViewsSidebar tickets={all} view={view} meId={me.data?.id} onSelectView={setView} />}
            <TicketList tickets={shown} selectedId={selectedId} onSelect={(tid) => navigate(`/support/tickets/${tid}`)} />
            <TicketConversation ticketId={selectedId} />
            <TicketContext ticketId={selectedId} />
            <NewTicketModal open={newOpen} onClose={() => setNewOpen(false)} />
        </div>
    );
}
