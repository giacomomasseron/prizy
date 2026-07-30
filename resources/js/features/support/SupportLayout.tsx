import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { useTickets, useTicketCounts, useSavedViews, useCreateSavedView, useDeleteSavedView } from './hooks';
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
    const [savedViewId, setSavedViewId] = useState<string | null>(null);

    const savedViewsQ = useSavedViews();
    const createView = useCreateSavedView();
    const deleteView = useDeleteSavedView();

    const activeSaved = useMemo(
        () => savedViewsQ.data?.find((v) => v.id === savedViewId) ?? null,
        [savedViewsQ.data, savedViewId],
    );

    const filters = useMemo(() => {
        if (activeSaved) return { ...activeSaved.definition.filter };
        const f = viewFilters(view, me.data?.id);
        if (channel) f.channel = channel;
        if (tag) f.tag_id = tag.id;
        return f;
    }, [activeSaved, view, channel, tag, me.data?.id]);

    const effectiveSort = activeSaved ? (activeSaved.definition.sort || 'updated_at') : sort;

    const ticketsQ = useTickets(filters, effectiveSort);
    const shown = useMemo(() => ticketsQ.data?.pages.flatMap((p) => p.items) ?? [], [ticketsQ.data]);
    const selectedId = id ?? shown[0]?.id;
    const counts = useTicketCounts().data;

    const selectView = (v: TicketViewKey) => { setSavedViewId(null); setView(v); };
    const selectChannel = (c: TicketChannel) => { setSavedViewId(null); setChannel((cur) => (cur === c ? null : c)); };
    const changeSort = (s: string) => { setSavedViewId(null); setSort(s); };
    const filterTag = (tid: string, name: string) => { setSavedViewId(null); setTag({ id: tid, name }); };

    const saveView = (name: string) => {
        createView.mutate(
            { name, definition: { filter: filters, sort: effectiveSort } },
            { onSuccess: (created) => setSavedViewId(created.id) },
        );
    };
    const removeView = (viewId: string) => {
        deleteView.mutate(viewId, {
            onSuccess: () => { if (savedViewId === viewId) { setSavedViewId(null); setView('mine'); } },
        });
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <SupportIconRail viewsOpen={viewsOpen} onToggleViews={() => setViewsOpen((o) => !o)} onNewTicket={() => setNewOpen(true)} />
            {viewsOpen && (
                <SupportViewsSidebar
                    counts={counts}
                    view={view}
                    onSelectView={selectView}
                    channel={channel}
                    onSelectChannel={selectChannel}
                    tag={tag}
                    onClearTag={() => setTag(null)}
                    savedViews={savedViewsQ.data ?? []}
                    savedViewId={savedViewId}
                    onSelectSavedView={setSavedViewId}
                    onDeleteSavedView={removeView}
                    onSaveView={saveView}
                />
            )}
            <TicketList
                tickets={shown}
                selectedId={selectedId}
                onSelect={(tid) => navigate(`/support/tickets/${tid}`)}
                sort={effectiveSort}
                onSortChange={changeSort}
                hasMore={!!ticketsQ.hasNextPage}
                onLoadMore={() => ticketsQ.fetchNextPage()}
                loadingMore={ticketsQ.isFetchingNextPage}
            />
            <TicketConversation ticketId={selectedId} />
            <TicketContext ticketId={selectedId} onFilterTag={filterTag} />
            <NewTicketModal open={newOpen} onClose={() => setNewOpen(false)} />
        </div>
    );
}
