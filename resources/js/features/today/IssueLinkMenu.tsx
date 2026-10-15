import { useEffect } from 'react';
import type { IssueLookupItem } from '../../lib/types';

export interface IssueLinkMenuProps {
    listId: string;
    optionId: (index: number) => string;
    issues: IssueLookupItem[];
    active: number;
    onHover: (index: number) => void;
    onPick: (index: number) => void;
    /** Shown instead of the list when there is nothing to offer (null while an answer is still on its way). */
    emptyText: string | null;
}

/**
 * The "Link an issue" list under the to-dos box (the Today v2 design): white with an ink edge and an offset shadow,
 * the reference in indigo before the title, the active row on the highlighter. Its colours are the note's own, so it
 * looks the same in both themes. A listbox driven from the field (aria-activedescendant); mousedown is prevented so
 * focus never leaves the text.
 */
export function IssueLinkMenu({ listId, optionId, issues, active, onHover, onPick, emptyText }: IssueLinkMenuProps) {
    // aria-activedescendant moves the active row without scrolling: keep it in view (jsdom has no scrollIntoView).
    useEffect(() => {
        document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    }, [active, optionId]);

    return (
        <div
            role="presentation"
            onMouseDown={(e) => e.preventDefault()}
            style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, maxHeight: 260, overflowY: 'auto',
                boxSizing: 'border-box', padding: 6, background: 'var(--sticky-pop)', color: 'var(--on-hi)',
                border: 'var(--line) solid var(--on-hi)', borderRadius: 'var(--radius-pop)', boxShadow: '4px 4px 0 var(--on-hi)', textAlign: 'left',
            }}
        >
            <div aria-hidden="true" style={{ padding: '4px 8px 6px', fontSize: 12, fontWeight: 700, opacity: 0.7 }}>Link an issue</div>
            {issues.length > 0 && (
                <div id={listId} role="listbox" aria-label="Link an issue">
                    {issues.map((issue, index) => (
                        <div
                            key={issue.id}
                            id={optionId(index)}
                            role="option"
                            aria-selected={index === active}
                            onMouseEnter={() => onHover(index)}
                            onClick={() => onPick(index)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10, padding: '7px 8px', cursor: 'pointer',
                                background: index === active ? 'var(--hi)' : 'transparent',
                            }}
                        >
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--sticky-ref)', flexShrink: 0 }}>{issue.identifier}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                        </div>
                    ))}
                </div>
            )}
            {issues.length === 0 && emptyText !== null && (
                <div role="status" style={{ padding: '10px 8px', fontSize: 13, opacity: 0.75 }}>{emptyText}</div>
            )}
        </div>
    );
}
