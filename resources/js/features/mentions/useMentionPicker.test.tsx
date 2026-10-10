import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { IssueLookupItem } from '../../lib/types';
import { useMentionPicker } from './useMentionPicker';

// P7-B: the @ mention picker (the Project v2 design) — people and issues, keyboard first.
const MEMBERS = [
    { id: 'u1', name: 'Maya Chen', is_agent: false },
    { id: 'u2', name: 'Priya Patel', is_agent: false },
    { id: 'me', name: 'Alex Rivera', is_agent: false },
];
const ISSUES: IssueLookupItem[] = Array.from({ length: 8 }, (_, i) => ({
    id: `i${i}`, identifier: `PRZ-ABC12${i}`, title: `Fix login ${i}`, status: 'todo',
}));

function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let lookupAnswer: IssueLookupItem[] = ISSUES;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    lookupAnswer = ISSUES;
    fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes('/issues/lookup')) return j({ data: lookupAnswer });
        if (String(url).includes('/members')) return j({ data: MEMBERS });
        if (String(url).endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: 'member' } });
        return j({ data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

function Harness({ field = 'input', canSearchIssues = true, onPickIssue }: { field?: 'input' | 'textarea'; canSearchIssues?: boolean; onPickIssue?: (i: IssueLookupItem) => void }) {
    const [value, setValue] = useState('');
    const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
    const picker = useMentionPicker({ value, onValueChange: setValue, fieldRef: ref, field, canSearchIssues, onPickIssue });
    const props = { ref, 'aria-label': 'Text', value, ...picker.fieldProps, onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => { picker.handleKeyDown(e); } };
    return (
        <div style={{ position: 'relative' }}>
            {field === 'input' ? <input {...props} /> : <textarea {...props} />}
            {picker.menu}
        </div>
    );
}

function renderPicker(props: Parameters<typeof Harness>[0] = {}) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><Harness {...props} /></QueryClientProvider>);
    return screen.getByLabelText('Text') as HTMLInputElement;
}

/** Type text as if at the end of the field (jsdom puts the caret at the end of a set value). */
function type(field: HTMLInputElement, text: string) {
    fireEvent.change(field, { target: { value: text } });
}

describe('P7-B: the @ mention picker', () => {
    it('opens on @ with People (not yourself) then Issues, each under its heading', async () => {
        const field = renderPicker();
        type(field, 'ask @');

        const people = within(await screen.findByRole('group', { name: 'People' })).getAllByRole('option');
        expect(people).toHaveLength(2); // Alex Rivera is you: left out
        expect(people[0]).toHaveTextContent('Maya Chen');
        expect(people[0]).toHaveTextContent('@maya');
        expect(people[1]).toHaveTextContent('Priya Patel');
        expect(screen.queryByRole('group', { name: 'Issues' })).toBeNull(); // no issues before a character is typed

        type(field, 'ask @fix');
        const issues = within(await screen.findByRole('group', { name: 'Issues' })).getAllByRole('option');
        expect(issues).toHaveLength(6); // the lookup answered 8: at most 6 are offered
        expect(issues[0]).toHaveTextContent('Fix login 0');
        expect(issues[0]).toHaveTextContent('PRZ-ABC120');
    });

    it('stays closed inside a word', async () => {
        const field = renderPicker();
        type(field, 'mail a@b');
        await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('is a combobox on an input: expanded, controlling the listbox, with the active option as its descendant', async () => {
        const field = renderPicker();
        type(field, '@');
        const list = await screen.findByRole('listbox', { name: 'Mentions' });

        expect(field).toHaveAttribute('role', 'combobox');
        expect(field).toHaveAttribute('aria-expanded', 'true');
        expect(field).toHaveAttribute('aria-autocomplete', 'list');
        expect(field).toHaveAttribute('aria-controls', list.id);
        const first = within(list).getAllByRole('option')[0];
        expect(field).toHaveAttribute('aria-activedescendant', first.id);
        expect(first).toHaveAttribute('aria-selected', 'true');
    });

    it('keeps the textbox role on a textarea but still points at the active option', async () => {
        const field = renderPicker({ field: 'textarea' });
        type(field, '@');
        const list = await screen.findByRole('listbox', { name: 'Mentions' });

        expect(field).not.toHaveAttribute('role');
        expect(field).not.toHaveAttribute('aria-expanded');
        expect(field).toHaveAttribute('aria-controls', list.id);
        expect(field).toHaveAttribute('aria-activedescendant', within(list).getAllByRole('option')[0].id);
    });

    it('moves with the arrow keys and wraps at both ends', async () => {
        const field = renderPicker({ canSearchIssues: false });
        type(field, '@');
        const options = within(await screen.findByRole('listbox')).getAllByRole('option');

        fireEvent.keyDown(field, { key: 'ArrowDown' });
        expect(field).toHaveAttribute('aria-activedescendant', options[1].id);
        fireEvent.keyDown(field, { key: 'ArrowDown' });
        expect(field).toHaveAttribute('aria-activedescendant', options[0].id);
        fireEvent.keyDown(field, { key: 'ArrowUp' });
        expect(field).toHaveAttribute('aria-activedescendant', options[1].id);
    });

    it('picks a person with Enter: @Full Name and a space replace the query, and the caret lands after them', async () => {
        const field = renderPicker();
        type(field, 'ask @ma');
        await screen.findByRole('option', { name: /Maya Chen/ });

        fireEvent.keyDown(field, { key: 'Enter' });

        expect(field.value).toBe('ask @Maya Chen ');
        expect(field.selectionStart).toBe(15);
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('picks an issue with Tab: its PRZ- reference is inserted and handed to onPickIssue', async () => {
        const onPickIssue = vi.fn();
        lookupAnswer = [ISSUES[0]];
        const field = renderPicker({ onPickIssue });
        type(field, 'about @fix');
        await screen.findByRole('option', { name: /Fix login 0/ });

        fireEvent.keyDown(field, { key: 'Tab' });

        expect(field.value).toBe('about PRZ-ABC120 ');
        expect(onPickIssue).toHaveBeenCalledWith(ISSUES[0]);
    });

    it('picks with the mouse: hover makes a row active, a click picks it, and mousedown keeps the focus in the field', async () => {
        const field = renderPicker({ canSearchIssues: false });
        type(field, '@');
        const options = within(await screen.findByRole('listbox')).getAllByRole('option');

        fireEvent.mouseEnter(options[1]);
        expect(options[1]).toHaveAttribute('aria-selected', 'true');
        expect(fireEvent.mouseDown(options[1])).toBe(false); // default prevented
        fireEvent.click(options[1]);

        expect(field.value).toBe('@Priya Patel ');
    });

    it('closes on Escape without letting the key reach a surrounding drawer', async () => {
        const outer = vi.fn();
        document.addEventListener('keydown', outer);
        const field = renderPicker();
        type(field, '@');
        await screen.findByRole('listbox');

        fireEvent.keyDown(field, { key: 'Escape' });

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(outer).not.toHaveBeenCalled();
        document.removeEventListener('keydown', outer);
    });

    it('closes when the field loses focus', async () => {
        const field = renderPicker();
        type(field, '@');
        await screen.findByRole('listbox');

        fireEvent.blur(field);

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('says when nothing matches', async () => {
        lookupAnswer = [];
        const field = renderPicker();
        type(field, '@zz');

        expect(await screen.findByRole('status')).toHaveTextContent('No people or issues match “zz”');
    });

    it('leaves issues out, and never asks for them, for someone who cannot search them', async () => {
        const field = renderPicker({ canSearchIssues: false });
        type(field, '@zz');

        expect(await screen.findByRole('status')).toHaveTextContent('No people match “zz”');
        await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/issues/lookup'))).toBe(false);
    });
});
