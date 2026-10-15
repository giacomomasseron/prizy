import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import type { IssueLookupItem } from '../../lib/types';
import { useIssueLookup } from '../mentions/hooks';
import { applyPick, detectIssueLink, type MentionQuery } from '../mentions/mentionText';
import { IssueLinkMenu } from './IssueLinkMenu';

export interface IssueLinkPickerOptions {
    value: string;
    onValueChange: (next: string) => void;
    fieldRef: RefObject<HTMLInputElement | null>;
    /** Offered before anything is typed after the `#`: today's plan, then the suggestions. */
    starters: IssueLookupItem[];
    onPickIssue: (issue: IssueLookupItem) => void;
    /** The field's own limit: the # button adds nothing past it. */
    maxLength: number;
}

export interface IssueLinkPicker {
    /** Spread on the field: change, caret and blur handlers, and the combobox ARIA that points at the list. */
    fieldProps: {
        onChange: (e: ChangeEvent<HTMLInputElement>) => void;
        onClick: (e: { currentTarget: HTMLInputElement }) => void;
        onKeyUp: (e: KeyboardEvent<HTMLInputElement>) => void;
        onBlur: () => void;
        role: 'combobox';
        'aria-expanded': boolean;
        'aria-autocomplete': 'list';
        'aria-controls'?: string;
        'aria-activedescendant'?: string;
    };
    /** Call first in the field's onKeyDown: true means the list used the key (↑/↓, Enter, Tab, Esc). */
    handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => boolean;
    /** The # button: add a `#` at the end of the text and open the list there. */
    openFromButton: () => void;
    /** The list, or null; render it inside a `position: relative` box around the field. */
    menu: ReactNode;
}

const LIMIT = 7;

/**
 * Link an issue with `#` (My to-dos, the Today v2 design). A `#` at the start of the text or after a space, or the
 * # button, opens "Link an issue": today's issues until something is typed, then a search of every issue (up to 7).
 * ↑/↓ move and wrap, Enter or Tab picks, Esc closes; picking replaces `#query` with `PRZ-XXXXXX `.
 */
export function useIssueLinkPicker({ value, onValueChange, fieldRef, starters, onPickIssue, maxLength }: IssueLinkPickerOptions): IssueLinkPicker {
    const [link, setLink] = useState<MentionQuery | null>(null);
    const [active, setActive] = useState(0);
    const pendingCaret = useRef<number | null>(null);
    const listId = useId();
    const optionId = (index: number) => `${listId}-option-${index}`;

    const q = link?.q ?? '';
    const lookup = useIssueLookup(q, link !== null);
    const issues = link === null ? [] : (q === '' ? starters : lookup.issues).slice(0, LIMIT);

    // A new query starts from the first row; a shorter list never leaves the active row past its end.
    useEffect(() => setActive(0), [q]);
    // The field was changed from outside (an add emptied it): a link it no longer holds is gone.
    useEffect(() => {
        setLink((l) => (l && value.slice(l.start, l.end) === `#${l.q}` ? l : null));
    }, [value]);
    const current = issues.length === 0 ? 0 : Math.min(active, issues.length - 1);

    // The value is controlled: put the caret after a pick (or the button's #) once the new text has rendered.
    useLayoutEffect(() => {
        const el = fieldRef.current;
        if (pendingCaret.current === null || !el) return;
        el.focus();
        el.setSelectionRange(pendingCaret.current, pendingCaret.current);
        pendingCaret.current = null;
    }, [value, fieldRef]);

    function detect(el: HTMLInputElement) {
        const next = detectIssueLink(el.value, el.selectionStart ?? el.value.length);
        setLink((prev) => (prev && next && prev.start === next.start && prev.q === next.q ? prev : next));
    }

    function pick(index: number) {
        const issue = issues[index];
        if (!link || !issue) return;
        const next = applyPick(value, link, issue.identifier);
        pendingCaret.current = next.caret;
        setLink(null);
        onValueChange(next.text);
        onPickIssue(issue);
    }

    function openFromButton() {
        const next = value + (value !== '' && !/\s$/.test(value) ? ' #' : '#');
        if (next.length > maxLength) {
            fieldRef.current?.focus();
            return;
        }
        pendingCaret.current = next.length;
        setLink({ start: next.length - 1, end: next.length, q: '' });
        onValueChange(next);
    }

    const emptyText = issues.length > 0 ? null
        : q === '' ? 'Type to search issues'
            : lookup.pending ? null : `No issues match “${q}”`;
    const isOpen = link !== null && (issues.length > 0 || emptyText !== null);
    const listed = isOpen && issues.length > 0;

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): boolean {
        // Nothing shown, or an input method composing: keys behave as before.
        if (!isOpen || e.nativeEvent.isComposing) return false;
        if (e.key === 'Escape') {
            // Close only the list, not a drawer or dialog around the field.
            e.preventDefault();
            e.stopPropagation();
            setLink(null);
            return true;
        }
        if (issues.length === 0) return false;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((current + step + issues.length) % issues.length);
            return true;
        }
        // Shift+Tab moves focus back (and the blur closes the list); it never picks.
        if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
            e.preventDefault();
            pick(current);
            return true;
        }
        return false;
    }

    return {
        fieldProps: {
            onChange: (e) => {
                onValueChange(e.target.value);
                detect(e.target);
            },
            onClick: (e) => detect(e.currentTarget),
            onKeyUp: (e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) detect(e.currentTarget);
            },
            onBlur: () => setLink(null),
            role: 'combobox',
            'aria-expanded': listed,
            'aria-autocomplete': 'list',
            'aria-controls': listed ? listId : undefined,
            'aria-activedescendant': listed ? optionId(current) : undefined,
        },
        handleKeyDown,
        openFromButton,
        menu: isOpen ? (
            <IssueLinkMenu
                listId={listId}
                optionId={optionId}
                issues={issues}
                active={current}
                onHover={setActive}
                onPick={pick}
                emptyText={emptyText}
            />
        ) : null,
    };
}
