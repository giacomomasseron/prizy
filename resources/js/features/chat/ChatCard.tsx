import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QueryState } from '../../components/ui/QueryState';
import { sectionTitle } from '../issues/issueStyles';
import { cardStyle } from '../projects/projectStyles';
import { chronological, useProjectMessages } from './chatHooks';
import { ChatComposer } from './ChatComposer';
import { ChatMessages } from './ChatMessages';
import { useProjectChannel, useProjectPresence } from './useProjectChannel';

/** How many of the latest messages the card shows. */
const RECENT = 6;

/**
 * The chat card on a project's Overview (the Project v2 design): who is online, Open → to the Chat tab, the latest
 * messages without edit controls, and the composer with the picker above it.
 */
export function ChatCard({ projectId, projectName }: { projectId: string; projectName: string }) {
    const messages = useProjectMessages(projectId);
    const online = useProjectPresence(projectId);
    useProjectChannel(projectId);
    const headingId = useId();
    const scroller = useRef<HTMLDivElement>(null);

    const recent = useMemo(() => chronological(messages.data).slice(-RECENT), [messages.data]);
    const last = recent[recent.length - 1]?.id;
    // The newest message stays in view.
    useLayoutEffect(() => {
        const el = scroller.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [last]);

    return (
        <section aria-labelledby={headingId} style={{ ...cardStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 10px' }}>
                <h2 id={headingId} style={sectionTitle(20)}>Chat</h2>
                {online && (
                    <span data-testid="chat-card-online" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--fg3)', fontWeight: 600 }}>
                        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
                        {online.length} online
                    </span>
                )}
                <Link to={`/projects/${projectId}/chat`} aria-label="Open the chat" className="text-fg3 hover:text-fg" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    Open <span aria-hidden="true">→</span>
                </Link>
            </div>
            <div ref={scroller} style={{ flex: 1, maxHeight: 440, overflow: 'auto', padding: '0 18px 14px' }}>
                <QueryState query={messages} what="the chat">
                    {recent.length === 0 ? (
                        <p style={{ margin: 0, padding: '18px 0', textAlign: 'center', fontSize: 13.5, color: 'var(--fg3)' }}>No messages yet. Say hello to the team.</p>
                    ) : (
                        <ChatMessages projectId={projectId} messages={recent} />
                    )}
                </QueryState>
            </div>
            <ChatComposer projectId={projectId} projectName={projectName} />
        </section>
    );
}
