import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { IssueLookupItem } from '../../lib/types';
import { useIssueLinkPicker } from './useIssueLinkPicker';

// Today v2: My to-dos link an issue with # (the design's "Link an issue" list).
const issue = (i: number, title = `Fix login ${i}`): IssueLookupItem => ({ id: `i${i}`, identifier: `PRZ-ABC12${i}`, title, status: 'todo' });
const STARTERS = Array.from({ length: 9 }, (_, i) => issue(i, `Planned ${i}`));
const FOUND = Array.from({ length: 8 }, (_, i) => issue(i));

function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let lookupAnswer: IssueLookupItem[] = FOUND;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    lookupAnswer = FOUND;
    fetchMock = vi.fn(async (url: string) => (String(url).includes('/issues/lookup') ? j({ data: lookupAnswer }) : j({ data: [] })));
    vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

function Harness({ starters = STARTERS, onPickIssue = () => {}, initial = '', maxLength = 500 }: { starters?: IssueLookupItem[]; onPickIssue?: (i: IssueLookupItem) => void; initial?: string; maxLength?: number }) {
    const [value, setValue] = useState(initial);
    const ref = useRef<HTMLInputElement>(null);
    const picker = useIssueLinkPicker({ value, onValueChange: setValue, fieldRef: ref, starters, onPickIssue, maxLength });
    return (
        <div onKeyDown={(e) => { if (e.key === 'Escape') (window as unknown as { outerEscape: boolean }).outerEscape = true; }}>
            <div style={{ position: 'relative' }}>
                <input ref={ref} aria-label="Text" value={value} {...picker.fieldProps} onKeyDown={(e) => { picker.handleKeyDown(e); }} />
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={picker.openFromButton}>#</button>
                {picker.menu}
            </div>
            <button type="button">Elsewhere</button>
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

const options = () => within(screen.getByRole('listbox', { name: 'Link an issue' })).getAllByRole('option');

describe('Today v2: the # issue link list', () => {
    it('opens on # with today\'s issues (at most 7) under "Link an issue", the first one active', async () => {
        const field = renderPicker();
        type(field, 'Reply on #');

        expect(screen.getByText('Link an issue')).toBeInTheDocument();
        expect(options()).toHaveLength(7);
        expect(options()[0]).toHaveTextContent('PRZ-ABC120');
        expect(options()[0]).toHaveTextContent('Planned 0');
        expect(options()[0]).toHaveAttribute('aria-selected', 'true');
        expect(field).toHaveAttribute('role', 'combobox');
        expect(field).toHaveAttribute('aria-expanded', 'true');
        expect(field).toHaveAttribute('aria-activedescendant', options()[0].id);
        expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/issues/lookup'))).toBe(false);
    });

    it('searches every issue once something is typed after the #', async () => {
        const field = renderPicker();
        type(field, '#fix');

        await waitFor(() => expect(options()[0]).toHaveTextContent('Fix login 0'));
        expect(options()).toHaveLength(7); // the lookup answered 8
        expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/issues/lookup?q=fix'))).toBe(true);
    });

    it('says when nothing matches, and asks for a word when there is nothing to offer yet', async () => {
        lookupAnswer = [];
        const field = renderPicker({ starters: [] });
        type(field, '#');
        expect(screen.getByText('Type to search issues')).toBeInTheDocument();

        type(field, '#zzz');
        expect(await screen.findByText('No issues match “zzz”')).toBeInTheDocument();
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('moves with ↓ and ↑ (wrapping), picks with Enter: the reference and a space replace #query', async () => {
        const onPickIssue = vi.fn();
        const field = renderPicker({ onPickIssue });
        type(field, 'See #');

        fireEvent.keyDown(field, { key: 'ArrowUp' });
        expect(options()[6]).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(field, { key: 'ArrowDown' });
        fireEvent.keyDown(field, { key: 'ArrowDown' });
        expect(options()[1]).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(field).toHaveValue('See PRZ-ABC121 ');
        expect(onPickIssue).toHaveBeenCalledWith(STARTERS[1]);
        expect(screen.queryByRole('listbox')).toBeNull();
        await waitFor(() => expect(field.selectionStart).toBe('See PRZ-ABC121 '.length));
    });

    it('picks with Tab and with a click, never with Shift+Tab', () => {
        const field = renderPicker();
        type(field, '#');
        fireEvent.keyDown(field, { key: 'Tab', shiftKey: true });
        expect(field).toHaveValue('#');

        fireEvent.keyDown(field, { key: 'Tab' });
        expect(field).toHaveValue('PRZ-ABC120 ');

        type(field, 'PRZ-ABC120 and #');
        fireEvent.click(options()[2]);
        expect(field).toHaveValue('PRZ-ABC120 and PRZ-ABC122 ');
    });

    it('closes on Escape without closing what is around the field, and on blur', () => {
        const field = renderPicker();
        (window as unknown as { outerEscape: boolean }).outerEscape = false;
        type(field, '#');
        fireEvent.keyDown(field, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
        expect((window as unknown as { outerEscape: boolean }).outerEscape).toBe(false);
        expect(field).toHaveValue('#');

        type(field, '# ');
        type(field, '#');
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        fireEvent.blur(field);
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('stays closed inside a word, and on @', () => {
        const field = renderPicker();
        type(field, 'C#');
        expect(screen.queryByRole('listbox')).toBeNull();
        type(field, 'ask @');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(field).not.toHaveAttribute('aria-controls');
    });

    it('the # button adds a # (after a space) at the end, opens the list and puts the caret after it', async () => {
        const field = renderPicker({ initial: 'Reply' });
        fireEvent.click(screen.getByRole('button', { name: '#' }));

        expect(field).toHaveValue('Reply #');
        expect(options()).toHaveLength(7);
        await waitFor(() => expect(document.activeElement).toBe(field));
        expect(field.selectionStart).toBe('Reply #'.length);

        fireEvent.keyDown(field, { key: 'Enter' });
        expect(field).toHaveValue('Reply PRZ-ABC120 ');
    });

    it('the # button adds no space to an empty box or after one', () => {
        const field = renderPicker();
        fireEvent.click(screen.getByRole('button', { name: '#' }));
        expect(field).toHaveValue('#');

        type(field, 'Ask ');
        fireEvent.keyDown(field, { key: 'Escape' });
        fireEvent.click(screen.getByRole('button', { name: '#' }));
        expect(field).toHaveValue('Ask #');
    });

    it('the # button leaves a full box as it is', () => {
        const field = renderPicker({ initial: 'abcd', maxLength: 5 });
        fireEvent.click(screen.getByRole('button', { name: '#' }));
        expect(field).toHaveValue('abcd');
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});
