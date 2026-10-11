import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useMe } from '../../auth/useAuth';
import { canDevelop } from '../../auth/capabilities';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { avatarFor } from '../../lib/avatarFor';
import type { IssueLookupItem } from '../../lib/types';
import { useMentionPicker } from '../mentions/useMentionPicker';
import { usePostMessage } from './chatHooks';
import { linkedIssues } from './chatFormat';
import { MAX_MESSAGE } from './ChatMessages';

const FAILED = "Couldn't send your message. Try again.";

/** The hint the Chat tab shows under its panel. */
export const CHAT_HINT = '@ to mention people or link issues · Enter to send';

/**
 * The chat composer (the Project v2 design): your avatar, a pill field with the @ picker opening above it, and Send.
 * Enter sends unless the picker is open or an input method is composing; blank text is ignored. The message links the
 * picked issues whose reference is still in the text. Viewers read the chat but cannot post.
 */
export function ChatComposer({ projectId, projectName }: { projectId: string; projectName: string }) {
    const me = useMe();
    const canPost = canDevelop(me.data);
    const [draft, setDraft] = useState('');
    const [picked, setPicked] = useState<IssueLookupItem[]>([]);
    const [error, setError] = useState('');
    const fieldRef = useRef<HTMLInputElement>(null);
    const post = usePostMessage(projectId, (failed) => {
        setError(FAILED);
        // Put the text and its links back, unless the field already holds something new.
        setDraft((d) => (d === '' ? failed.body : d));
        setPicked((p) => (p.length === 0 ? failed.issues : p));
    });
    const picker = useMentionPicker({
        value: draft, onValueChange: setDraft, fieldRef, field: 'input', canSearchIssues: true,
        onPickIssue: (issue) => setPicked((p) => [...p, issue]), placement: 'above',
    });

    function send() {
        const body = draft.trim();
        if (!canPost || body === '') return;
        setError('');
        post.mutate({ body, issues: linkedIssues(body, picked) });
        setDraft('');
        setPicked([]);
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (picker.handleKeyDown(e)) return;
        // Not while an input method is composing: that Enter commits the conversion, not the message.
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
        }
    }

    const label = `Message the ${projectName} team`;
    const self = me.data ? avatarFor(me.data) : null;
    return (
        <div style={{ borderTop: '1.5px solid var(--border)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {self && <Avatar initials={self.initials} color={self.color} size={30} title={me.data?.name} />}
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <input
                        ref={fieldRef}
                        type="text"
                        aria-label={label}
                        placeholder={`${label}… (@ to mention)`}
                        maxLength={MAX_MESSAGE}
                        value={draft}
                        disabled={!canPost}
                        {...picker.fieldProps}
                        onKeyDown={onKeyDown}
                        className="border-border2 focus:border-fg"
                        style={{
                            width: '100%', boxSizing: 'border-box', padding: '10px 16px', borderRadius: 'var(--radius-pill)', borderWidth: 1.5,
                            borderStyle: 'solid', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                    {picker.menu}
                </div>
                <Button onClick={send} disabled={!canPost} style={{ padding: '9px 18px', fontSize: 13.5, flexShrink: 0 }}>Send</Button>
            </div>
            {!canPost && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--fg3)' }}>Viewers can read the chat.</p>}
            {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 12.5, fontWeight: 600, color: 'var(--red-ink)' }}>{error}</p>}
        </div>
    );
}
