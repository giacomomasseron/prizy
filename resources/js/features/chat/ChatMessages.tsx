import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop } from '../../auth/capabilities';
import { Avatar } from '../../components/ui/Avatar';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { avatarFor } from '../../lib/avatarFor';
import type { IssueLookupItem, ProjectMessage } from '../../lib/types';
import { useMembers } from '../members/hooks';
import { textParts } from '../mentions/mentionText';
import { useMentionPicker } from '../mentions/useMentionPicker';
import { useDeleteMessage, useEditMessage } from './chatHooks';
import { chatRows, linkedIssues, timeLabel } from './chatFormat';

export const MAX_MESSAGE = 4000;

const PILL: CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent2)',
    borderRadius: 'var(--radius-pill)', padding: '1px 8px', textDecoration: 'none',
};
const ACTION = 'border-none bg-transparent p-0 text-fg3 hover:text-fg';
const ACTION_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

/** A message's text: each linked issue's reference is a pill that opens it, and members' @names are highlighted. */
export function MessageText({ message, names }: { message: ProjectMessage; names: string[] }) {
    const byRef = new Map(message.issues.map((i) => [i.identifier, i]));
    return (
        <>
            {textParts(message.body, [...byRef.keys()], names).map((p, i) => {
                const issue = p.kind === 'ref' ? byRef.get(p.text) : undefined;
                if (issue) {
                    return <Link key={i} to={`/issues/${issue.id}`} title={issue.title} className="hover:underline" style={PILL}>{issue.identifier}</Link>;
                }
                if (p.kind === 'name') return <span key={i} className="hl" style={{ fontWeight: 700, padding: '0 2px', margin: 0 }}>{p.text}</span>;
                return <Fragment key={i}>{p.text}</Fragment>;
            })}
        </>
    );
}

function DaySeparator({ label }: { label: string }) {
    const rule: CSSProperties = { flex: 1, borderTop: '1.5px dashed var(--border)' };
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 6px' }}>
            <span aria-hidden="true" style={rule} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg3)' }}>{label}</span>
            <span aria-hidden="true" style={rule} />
        </div>
    );
}

function sameIssues(a: IssueLookupItem[], b: IssueLookupItem[]): boolean {
    return a.length === b.length && a.every((i) => b.some((j) => j.id === i.id));
}

/** The inline edit: the text with the picker. Enter saves, Esc cancels; blank is not saved, and no change sends nothing. */
function EditField({ projectId, message, onDone }: { projectId: string; message: ProjectMessage; onDone: () => void }) {
    const [text, setText] = useState(message.body);
    const [picked, setPicked] = useState<IssueLookupItem[]>(message.issues);
    const [error, setError] = useState('');
    const fieldRef = useRef<HTMLInputElement>(null);
    const edit = useEditMessage(projectId);
    const picker = useMentionPicker({
        value: text, onValueChange: setText, fieldRef, field: 'input', canSearchIssues: true,
        onPickIssue: (issue) => setPicked((p) => [...p, issue]),
    });

    useEffect(() => fieldRef.current?.focus(), []);

    function save() {
        const body = text.trim();
        if (body === '') return;
        const issues = linkedIssues(body, picked);
        // Nothing changed: no request, so the message is not marked (edited).
        if (body === message.body && sameIssues(issues, message.issues)) {
            onDone();
            return;
        }
        setError('');
        edit.mutate({ id: message.id, body, issues }, { onSuccess: onDone, onError: () => setError("Couldn't save your edit. Try again.") });
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (picker.handleKeyDown(e) || e.nativeEvent.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            save();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onDone();
        }
    }

    return (
        <div>
            <div style={{ position: 'relative' }}>
                <input
                    ref={fieldRef}
                    type="text"
                    aria-label="Edit message"
                    maxLength={MAX_MESSAGE}
                    value={text}
                    {...picker.fieldProps}
                    onKeyDown={onKeyDown}
                    className="border-border2 focus:border-fg"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 12px', borderRadius: 10, borderWidth: 1.5, borderStyle: 'solid', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14.5, outline: 'none', fontFamily: 'inherit' }}
                />
                {picker.menu}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg3)' }}>Enter to save · Esc to cancel</p>
            {error && <p role="alert" style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: 'var(--red-ink)' }}>{error}</p>}
        </div>
    );
}

interface MessageRowProps {
    projectId: string;
    message: ProjectMessage;
    head: boolean;
    author: string;
    names: string[];
    own: boolean;
    highlighted: boolean;
}

function MessageRow({ projectId, message, head, author, names, own, highlighted }: MessageRowProps) {
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const remove = useDeleteMessage(projectId);
    const confirm = useConfirm();
    const editButton = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);

    // Leaving the inline edit puts focus back on Edit.
    useEffect(() => {
        if (wasEditing.current && !editing) editButton.current?.focus();
        wasEditing.current = editing;
    }, [editing]);

    async function onDelete() {
        const ok = await confirm({ title: 'Delete this message?', message: 'It is removed from the chat for everyone.', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        setError('');
        remove.mutate(message.id, { onError: () => setError("Couldn't delete the message. Try again.") });
    }

    const person = avatarFor({ id: message.user_id, name: author });
    return (
        <div
            className="group"
            style={{
                display: 'flex', gap: 12, paddingTop: head ? 12 : 2, borderRadius: 10,
                background: highlighted ? 'var(--accent2)' : 'transparent', transition: 'background .6s',
            }}
        >
            <span style={{ width: 32, flexShrink: 0, display: 'flex' }}>
                {head && <Avatar initials={person.initials} color={person.color} size={32} title={author} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                {head && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{author}</span>
                        <time dateTime={message.created_at} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{timeLabel(message.created_at)}</time>
                    </div>
                )}
                {editing ? (
                    <EditField projectId={projectId} message={message} onDone={() => setEditing(false)} />
                ) : (
                    <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--fg)', overflowWrap: 'anywhere' }}>
                        <MessageText message={message} names={names} />
                        {message.edited_at && <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--fg3)' }}>(edited)</span>}
                    </div>
                )}
                {error && <p role="alert" style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: 'var(--red-ink)' }}>{error}</p>}
            </div>
            {own && !editing && (
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" style={{ display: 'flex', gap: 10, alignSelf: 'flex-start', paddingTop: head ? 2 : 0 }}>
                    <button ref={editButton} type="button" className={ACTION} style={ACTION_STYLE} onClick={() => setEditing(true)}>Edit</button>
                    <button type="button" className={ACTION} style={ACTION_STYLE} onClick={onDelete}>Delete</button>
                </div>
            )}
        </div>
    );
}

export interface ChatMessagesProps {
    projectId: string;
    /** Oldest first. */
    messages: ProjectMessage[];
    /** Edit and Delete on your own messages: the Chat tab has them, the Overview card doesn't. */
    editable?: boolean;
    /** The message a deep link points at, highlighted. */
    highlightId?: string | null;
}

/**
 * A project's messages (PRD §3.2.11, the Project v2 design): a dashed separator per day, and one avatar, name and time
 * per author run.
 */
export function ChatMessages({ projectId, messages, editable = false, highlightId = null }: ChatMessagesProps) {
    const me = useMe();
    const members = useMembers();
    const names = useMemo(() => (members.data ?? []).map((m) => m.name), [members.data]);
    const canPost = canDevelop(me.data);
    const nameOf = (id: string) => members.data?.find((m) => m.id === id)?.name ?? 'Former member';

    return (
        <ol aria-label="Messages" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {chatRows(messages).map(({ message, day, head }) => (
                <li key={message.id} data-message-id={message.id}>
                    {day && <DaySeparator label={day} />}
                    <MessageRow
                        projectId={projectId}
                        message={message}
                        head={head}
                        author={nameOf(message.user_id)}
                        names={names}
                        own={editable && canPost && message.user_id === me.data?.id}
                        highlighted={message.id === highlightId}
                    />
                </li>
            ))}
        </ol>
    );
}
