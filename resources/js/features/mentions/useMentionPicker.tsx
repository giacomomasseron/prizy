import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import { useMe } from '../../auth/useAuth';
import { useMembers } from '../members/hooks';
import type { IssueLookupItem } from '../../lib/types';
import { useIssueLookup } from './hooks';
import { MentionMenu, type MentionOption } from './MentionMenu';
import { applyPick, detectMention, matchMembers, type MentionQuery } from './mentionText';

type Field = HTMLInputElement | HTMLTextAreaElement;

export interface MentionPickerOptions {
    value: string;
    onValueChange: (next: string) => void;
    fieldRef: RefObject<Field | null>;
    /** `input` gets the combobox role; a `textarea` keeps its textbox role (ARIA in HTML allows no combobox there). */
    field: 'input' | 'textarea';
    /** Issues are offered only to tracker users: the lookup is tracker-gated. */
    canSearchIssues: boolean;
    onPickIssue?: (issue: IssueLookupItem) => void;
    placement?: 'below' | 'above';
}

export interface MentionPicker {
    /** Spread on the field: change, caret and blur handlers, and the ARIA that points at the popover. */
    fieldProps: {
        onChange: (e: ChangeEvent<Field>) => void;
        onClick: (e: { currentTarget: Field }) => void;
        onKeyUp: (e: KeyboardEvent<Field>) => void;
        onBlur: () => void;
        role?: 'combobox';
        'aria-expanded'?: boolean;
        'aria-autocomplete': 'list';
        'aria-controls'?: string;
        'aria-activedescendant'?: string;
    };
    /** Call first in the field's onKeyDown: true means the picker used the key (↑/↓, Enter, Tab, Esc). */
    handleKeyDown: (e: KeyboardEvent<Field>) => boolean;
    /** The popover, or null; render it inside a `position: relative` box around the field. */
    menu: ReactNode;
    isOpen: boolean;
}

const PEOPLE_LIMIT = 5;
const ISSUE_LIMIT = 6;

/**
 * The @ mention picker (P7-B, the Project v2 design). Typing `@` at the start of the text or after a space opens a
 * popover of workspace people (up to 5, not yourself) and issues (up to 6, tracker users only, once a character is
 * typed). ↑/↓ move and wrap, Enter or Tab picks, Esc closes; picking replaces `@query` with `@Full Name ` or
 * `PRZ-XXXXXX `. When the picker is closed, every key behaves as before.
 */
export function useMentionPicker({ value, onValueChange, fieldRef, field, canSearchIssues, onPickIssue, placement = 'below' }: MentionPickerOptions): MentionPicker {
    const me = useMe();
    const members = useMembers();
    const [mention, setMention] = useState<MentionQuery | null>(null);
    const [active, setActive] = useState(0);
    const pendingCaret = useRef<number | null>(null);
    const listId = useId();
    const optionId = (index: number) => `${listId}-option-${index}`;

    const q = mention?.q ?? '';
    const lookup = useIssueLookup(q, mention !== null && canSearchIssues);

    const options: MentionOption[] = useMemo(() => {
        if (mention === null) return [];
        const people = matchMembers(members.data ?? [], q, me.data?.id, PEOPLE_LIMIT)
            .map((person): MentionOption => ({ kind: 'person', key: `person:${person.id}`, person }));
        const issues = lookup.issues.slice(0, ISSUE_LIMIT)
            .map((issue): MentionOption => ({ kind: 'issue', key: `issue:${issue.id}`, issue }));
        return [...people, ...issues];
    }, [mention, q, members.data, me.data?.id, lookup.issues]);

    // A new query starts from the first row; a shorter list never leaves the active row past its end.
    useEffect(() => setActive(0), [q]);
    const current = options.length === 0 ? 0 : Math.min(active, options.length - 1);

    // The value is controlled: put the caret after a pick once the new text has rendered.
    useLayoutEffect(() => {
        const el = fieldRef.current;
        if (pendingCaret.current === null || !el) return;
        el.focus();
        el.setSelectionRange(pendingCaret.current, pendingCaret.current);
        pendingCaret.current = null;
    }, [value, fieldRef]);

    function detect(el: Field) {
        const next = detectMention(el.value, el.selectionStart ?? el.value.length);
        setMention((prev) => (prev && next && prev.start === next.start && prev.q === next.q ? prev : next));
    }

    function pick(index: number) {
        const option = options[index];
        if (!mention || !option) return;
        const insert = option.kind === 'person' ? `@${option.person.name}` : option.issue.identifier;
        const next = applyPick(value, mention, insert);
        pendingCaret.current = next.caret;
        setMention(null);
        onValueChange(next.text);
        if (option.kind === 'issue') onPickIssue?.(option.issue);
    }

    function handleKeyDown(e: KeyboardEvent<Field>): boolean {
        if (mention === null) return false;
        if (e.key === 'Escape') {
            // Close only the picker, not a drawer or dialog around the field.
            e.preventDefault();
            e.stopPropagation();
            setMention(null);
            return true;
        }
        if (options.length === 0) return false;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((current + step + options.length) % options.length);
            return true;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            pick(current);
            return true;
        }
        return false;
    }

    const emptyText = options.length > 0 || lookup.pending || members.isLoading
        ? null
        : canSearchIssues ? `No people or issues match “${q}”` : `No people match “${q}”`;
    const isOpen = mention !== null && (options.length > 0 || emptyText !== null);
    const listed = isOpen && options.length > 0;

    return {
        fieldProps: {
            onChange: (e) => {
                onValueChange(e.target.value);
                detect(e.target);
            },
            onClick: (e) => detect(e.currentTarget),
            onKeyUp: (e) => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) detect(e.currentTarget);
            },
            onBlur: () => setMention(null),
            ...(field === 'input' ? { role: 'combobox' as const, 'aria-expanded': listed } : {}),
            'aria-autocomplete': 'list',
            'aria-controls': listed ? listId : undefined,
            'aria-activedescendant': listed ? optionId(current) : undefined,
        },
        handleKeyDown,
        menu: isOpen ? (
            <MentionMenu
                listId={listId}
                optionId={optionId}
                options={options}
                active={current}
                onHover={setActive}
                onPick={pick}
                emptyText={emptyText}
                placement={placement}
            />
        ) : null,
        isOpen,
    };
}
