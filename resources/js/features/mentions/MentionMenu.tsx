import type { CSSProperties } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import type { IssueLookupItem } from '../../lib/types';
import { mentionHandle, type MentionMember } from './mentionText';

/** One row of the picker: a person or an issue. */
export type MentionOption =
    | { kind: 'person'; key: string; person: MentionMember }
    | { kind: 'issue'; key: string; issue: IssueLookupItem };

export interface MentionMenuProps {
    listId: string;
    optionId: (index: number) => string;
    options: MentionOption[];
    active: number;
    onHover: (index: number) => void;
    onPick: (index: number) => void;
    /** Shown instead of the list when nothing matches (null while an answer is still on its way). */
    emptyText: string | null;
    placement: 'below' | 'above';
}

const HEADING: CSSProperties = { padding: '8px 10px 4px', fontSize: 11.5, fontWeight: 800, color: 'var(--fg3)', letterSpacing: '.02em' };
const BADGE: CSSProperties = {
    width: 22, height: 22, borderRadius: 7, background: 'var(--accent2)', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 800,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

/**
 * The @ mention popover (P7-B, the Project v2 design): People, then Issues, under their headings. A listbox driven
 * from the field (aria-activedescendant), so focus never leaves the text; mousedown is prevented for the same reason.
 */
export function MentionMenu({ listId, optionId, options, active, onHover, onPick, emptyText, placement }: MentionMenuProps) {
    const people = options.map((o, i) => [o, i] as const).filter(([o]) => o.kind === 'person');
    const issues = options.map((o, i) => [o, i] as const).filter(([o]) => o.kind === 'issue');

    const row = (option: MentionOption, index: number) => {
        const on = index === active;
        return (
            <div
                key={option.key}
                id={optionId(index)}
                role="option"
                aria-selected={on}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(index)}
                className={on ? 'bg-accent2' : 'bg-transparent'}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, color: 'var(--fg)', fontSize: 13.5, fontWeight: on ? 700 : 600, cursor: 'pointer' }}
            >
                {option.kind === 'person' ? (
                    <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>
                        <Avatar {...avatarFor(option.person)} size={22} />
                    </span>
                ) : (
                    <span aria-hidden="true" style={BADGE}>#</span>
                )}
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.kind === 'person' ? option.person.name : option.issue.title}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--fg3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {option.kind === 'person' ? mentionHandle(option.person.name) : option.issue.identifier}
                </span>
            </div>
        );
    };

    return (
        <div
            role="presentation"
            onMouseDown={(e) => e.preventDefault()}
            className="mention-pop"
            style={{
                position: 'absolute', zIndex: 30, left: 0, width: '100%', maxWidth: 380, maxHeight: 280, overflowY: 'auto',
                boxSizing: 'border-box', padding: 6, background: 'var(--panel)', border: 'var(--line) solid var(--fg)',
                borderRadius: 'var(--radius-pop)', boxShadow: 'var(--pop-shadow)', textAlign: 'left',
                ...(placement === 'below' ? { top: 'calc(100% + 6px)' } : { bottom: 'calc(100% + 6px)' }),
            }}
        >
            {options.length > 0 && (
                <div id={listId} role="listbox" aria-label="Mentions">
                    {people.length > 0 && (
                        <div role="group" aria-label="People">
                            <div aria-hidden="true" style={HEADING}>People</div>
                            {people.map(([o, i]) => row(o, i))}
                        </div>
                    )}
                    {issues.length > 0 && (
                        <div role="group" aria-label="Issues">
                            <div aria-hidden="true" style={HEADING}>Issues</div>
                            {issues.map(([o, i]) => row(o, i))}
                        </div>
                    )}
                </div>
            )}
            {options.length === 0 && emptyText !== null && (
                <div role="status" style={{ padding: '12px 10px', fontSize: 13, color: 'var(--fg3)', fontWeight: 600 }}>{emptyText}</div>
            )}
        </div>
    );
}
