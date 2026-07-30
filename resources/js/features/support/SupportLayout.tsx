import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { useTickets, useTicketCounts } from './hooks';
import { viewFilters, type TicketViewKey } from './ticketViews';
import { SupportIconRail } from './SupportIconRail';
import { SupportViewsSidebar } from './SupportViewsSidebar';
import { TicketList } from './TicketList';
import { TicketConversation } from './TicketConversation';
import { TicketContext } from './TicketContext';
import { NewTicketModal } from './NewTicketModal';
import type { TicketChannel } from '../../lib/types';

export default function SupportLayout() {
    const me = useMe();
    const navigate = useNavigate();
    const { id } = useParams();
    const [view, setView] = useState<TicketViewKey>('mine');
    const [channel, setChannel] = useState<TicketChannel | null>(null);
    const [tag, setTag] = useState<{ id: string; name: string } | null>(null);
    const [viewsOpen, setViewsOpen] = useState(true);
    const [newOpen, setNewOpen] = useState(false);
    const [sort, setSort] = useState<string>('updated_at');

    const filters = useMemo(() => {
        const f = viewFilters(view, me.data?.id);
        if (channel) f.channel = channel;
        if (tag) f.tag_id = tag.id;
        return f;
    }, [view, channel, tag, me.data?.id]);

    const ticketsQ = useTickets(filters, sort);
    const shown = useMemo(() => ticketsQ.data?.pages.flatMap((p) => p.items) ?? [], [ticketsQ.data]);
    const selectedId = id ?? shown[0]?.id;
    const counts = useTicketCounts().data;

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <SupportIconRail viewsOpen={viewsOpen} onToggleViews={() => setViewsOpen((o) => !o)} onNewTicket={() => setNewOpen(true)} />
            {viewsOpen && (
                <SupportViewsSidebar
                    counts={counts}
                    view={view}
                    onSelectView={setView}
                    channel={channel}
                    onSelectChannel={(c) => setChannel((cur) => (cur === c ? null : c))}
                    tag={tag}
                    onClearTag={() => setTag(null)}
                />
            )}
            <TicketList
                tickets={shown}
                selectedId={selectedId}
                onSelect={(tid) => navigate(`/support/tickets/${tid}`)}
                sort={sort}
                onSortChange={setSort}
                hasMore={!!ticketsQ.hasNextPage}
                onLoadMore={() => ticketsQ.fetchNextPage()}
                loadingMore={ticketsQ.isFetchingNextPage}
            />
            <TicketConversation ticketId={selectedId} />
            <TicketContext ticketId={selectedId} onFilterTag={(id, name) => setTag({ id, name })} />
            <NewTicketModal open={newOpen} onClose={() => setNewOpen(false)} />
        </div>
    );
}
