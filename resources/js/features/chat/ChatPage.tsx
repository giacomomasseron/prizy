import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop } from '../../auth/capabilities';
import { AvatarStack } from '../../components/ui/AvatarStack';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { avatarFor } from '../../lib/avatarFor';
import { useProject } from '../projects/hooks';
import { pageCount, pageTitle, titleRow } from '../projects/projectStyles';
import { chronological, useProjectMessages } from './chatHooks';
import { CHAT_HINT, ChatComposer } from './ChatComposer';
import { ChatMessages } from './ChatMessages';
import { useProjectChannel, useProjectPresence } from './useProjectChannel';

/** Within this many pixels of an edge counts as at it. */
const EDGE = 80;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The project's Chat tab (PRD §3.2.11, the Project v2 design). It opens at the newest message and follows new ones
 * while you are at the bottom (and your own always); older pages load when the top comes into view (or from the button), keeping the
 * scroll position. `?message=<id>` scrolls to that message and highlights it, loading older pages until it is found.
 */
export default function ChatPage() {
    const { id = '' } = useParams();
    const project = useProject(id);
    const me = useMe();
    const messages = useProjectMessages(id);
    const online = useProjectPresence(id);
    useProjectChannel(id);
    const [params] = useSearchParams();
    // Only a UUID can name a message: anything else would page through the whole history looking for it.
    const rawTarget = params.get('message');
    const target = rawTarget !== null && UUID.test(rawTarget) ? rawTarget : null;
    const [highlight, setHighlight] = useState<string | null>(null);

    const scroller = useRef<HTMLDivElement>(null);
    const fromBottom = useRef(0);
    const atBottom = useRef(true);
    const edges = useRef<{ first?: string; last?: string }>({});
    const found = useRef<string | null>(null);

    const list = useMemo(() => chronological(messages.data), [messages.data]);
    const first = list[0]?.id;
    const last = list[list.length - 1]?.id;
    const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = messages;
    const lastIsMine = list[list.length - 1]?.user_id === me.data?.id;

    function loadOlder() {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }

    // After a failed page the top no longer retries on every scroll: the button is the retry.
    function onTop() {
        if (!isFetchNextPageError) loadOlder();
    }

    function onScroll() {
        const el = scroller.current;
        if (!el) return;
        fromBottom.current = el.scrollHeight - el.scrollTop;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < EDGE;
        if (el.scrollTop < EDGE) onTop();
    }

    // Place the view when the messages change: the first load opens at the bottom, older messages keep what you were
    // reading where it was, and a new message is followed while you are at the bottom, or when it is yours.
    useLayoutEffect(() => {
        const el = scroller.current;
        const prev = edges.current;
        edges.current = { first, last };
        if (!el || !last) return;
        if (prev.last === undefined) el.scrollTop = el.scrollHeight;
        else if (prev.first !== first) el.scrollTop = el.scrollHeight - fromBottom.current;
        else if (prev.last !== last && (atBottom.current || lastIsMine)) el.scrollTop = el.scrollHeight;
        fromBottom.current = el.scrollHeight - el.scrollTop;
    }, [first, last]);

    // A deep link: scroll to the message and highlight it, or load older pages until it turns up.
    useEffect(() => {
        if (!target || found.current === target || !messages.isSuccess) return;
        // Matched against the loaded ids, so the link's text never reaches a selector.
        if (list.some((m) => m.id === target)) {
            found.current = target;
            scroller.current?.querySelector(`[data-message-id="${target}"]`)?.scrollIntoView?.({ block: 'center' });
            setHighlight(target);
            return;
        }
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, [target, list, messages.isSuccess, hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        if (!highlight) return;
        const t = setTimeout(() => setHighlight(null), 2000);
        return () => clearTimeout(t);
    }, [highlight]);

    const p = project.data;
    if (!p) return null; // ProjectWorkspace already guards loading / not-found

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 170px)', minHeight: 420 }}>
            <div style={{ ...titleRow, flexWrap: 'wrap' }}>
                <h1 style={pageTitle}><span className="hl">Chat</span></h1>
                <span style={pageCount}>{p.messages_count ?? list.length}</span>
                {online && (
                    <span data-testid="chat-online" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg2)', fontWeight: 600 }}>
                        <AvatarStack avatars={online.slice(0, 3).map((m) => ({ ...avatarFor(m), title: m.name }))} size={24} max={3} />
                        {online.length} online
                    </span>
                )}
            </div>
            <div style={{ flex: 1, minHeight: 0, border: '1.5px solid var(--border)', borderRadius: 20, background: 'var(--panel)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div ref={scroller} data-testid="chat-scroll" onScroll={onScroll} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 26px 18px' }}>
                    <QueryState query={messages} what="the chat" frame={{ padding: '14px 0' }}>
                        {hasNextPage && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                                <Button variant="secondary" size="sm" disabled={isFetchingNextPage} onClick={loadOlder}>
                                    {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
                                </Button>
                            </div>
                        )}
                        {isFetchNextPageError && (
                            <p role="alert" style={{ margin: 0, textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--red-ink)' }}>Couldn't load older messages.</p>
                        )}
                        {list.length === 0 ? (
                            <p style={{ margin: 0, padding: '40px 0', textAlign: 'center', fontSize: 14, color: 'var(--fg3)' }}>No messages yet. Say hello to the team.</p>
                        ) : (
                            <ChatMessages projectId={id} messages={list} editable highlightId={highlight} />
                        )}
                    </QueryState>
                </div>
                <ChatComposer projectId={id} projectName={p.name} />
            </div>
            {canDevelop(me.data) && <p style={{ margin: '8px 0 0', paddingLeft: 6, fontSize: 12.5, color: 'var(--fg3)' }}>{CHAT_HINT}</p>}
        </div>
    );
}
