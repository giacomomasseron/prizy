import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Issue } from '../../lib/types';
import { StarButton, StarToggle } from './StarToggle';

// P7-A: the personal star (PRD §3.2.9) — the toggle on rows and cards, the header button, and the optimistic update.
const ISSUE = { id: 'i-1', title: 'Fix login', starred: false, starred_at: null } as unknown as Issue;

function client() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}
function withClient(ui: ReactNode, qc = client()) {
    return { qc, ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) };
}
/** fetch that never answers: the mutation stays pending, so the optimistic state can be read. */
function pendingFetch() {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('P7-A: StarToggle', () => {
    it('is a 24×24 toggle named Star: ☆ and not pressed when off, ★ and pressed when on, with a tooltip for each', () => {
        withClient(<StarToggle issue={ISSUE} />);
        const off = screen.getByRole('button', { name: 'Star' });
        expect(off).toHaveAttribute('aria-pressed', 'false');
        expect(off).toHaveAttribute('title', 'Star — pin to top');
        expect(off.textContent).toBe('☆');
        expect(off.style.width).toBe('24px');
        expect(off.style.height).toBe('24px');

        withClient(<StarToggle issue={{ ...ISSUE, starred: true }} />);
        const on = screen.getAllByRole('button', { name: 'Star' })[1];
        expect(on).toHaveAttribute('aria-pressed', 'true');
        expect(on).toHaveAttribute('title', 'Unstar');
        expect(on.textContent).toBe('★');
    });

    it('keeps its colours and hover in classes (faint off, accent when pressed), none inline', () => {
        withClient(<StarToggle issue={ISSUE} />);
        const star = screen.getByRole('button', { name: 'Star' });
        expect(star.className).toContain('text-fg3');
        expect(star.className).toContain('aria-pressed:text-accent');
        expect(star.className).toContain('hover:bg-hover');
        expect(star.style.color).toBe('');
        expect(star.style.background).toBe('');
    });

    it('keeps its click and pointerdown to itself (the row and the card open the issue on click; the board drags on pointerdown)', () => {
        pendingFetch();
        const onClick = vi.fn();
        const onPointerDown = vi.fn();
        withClient(<div onClick={onClick} onPointerDown={onPointerDown}><StarToggle issue={ISSUE} /></div>);
        const star = screen.getByRole('button', { name: 'Star' });
        fireEvent.pointerDown(star);
        fireEvent.click(star);
        expect(onClick).not.toHaveBeenCalled();
        expect(onPointerDown).not.toHaveBeenCalled();
    });

    it('stars with PUT and unstars with DELETE', async () => {
        const fetchMock = pendingFetch();
        withClient(<StarToggle issue={ISSUE} />);
        fireEvent.click(screen.getByRole('button', { name: 'Star' }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/v1/issues/i-1/star', expect.objectContaining({ method: 'PUT' })));

        fetchMock.mockClear();
        withClient(<StarToggle issue={{ ...ISSUE, id: 'i-2', starred: true }} />);
        fireEvent.click(screen.getAllByRole('button', { name: 'Star' })[1]);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/v1/issues/i-2/star', expect.objectContaining({ method: 'DELETE' })));
    });

    it('flips every cached list page and the issue at once (optimistic)', async () => {
        pendingFetch();
        const qc = client();
        qc.setQueryData(['issues', {}], { items: [ISSUE], next: null });
        qc.setQueryData(['issues', { starred: 'true' }], { items: [], next: null });
        qc.setQueryData(['issue', 'i-1'], ISSUE);
        withClient(<StarToggle issue={ISSUE} />, qc);

        fireEvent.click(screen.getByRole('button', { name: 'Star' }));

        await waitFor(() => expect(qc.getQueryData<{ items: Issue[] }>(['issues', {}])?.items[0].starred).toBe(true));
        expect(qc.getQueryData<{ items: Issue[] }>(['issues', {}])?.items[0].starred_at).toEqual(expect.any(String));
        expect(qc.getQueryData<Issue>(['issue', 'i-1'])?.starred).toBe(true);
    });

    it('rolls back when the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ title: 'Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
        const qc = client();
        qc.setQueryData(['issues', {}], { items: [ISSUE], next: null });
        withClient(<StarToggle issue={ISSUE} />, qc);

        fireEvent.click(screen.getByRole('button', { name: 'Star' }));

        await waitFor(() => expect(qc.getMutationCache().getAll()[0]?.state.status).toBe('error'));
        expect(qc.getQueryData<{ items: Issue[] }>(['issues', {}])?.items[0].starred).toBe(false);
    });
});

describe('P7-A: StarButton (the issue headers)', () => {
    it('reads "Star", not pressed, when off and "Starred", pressed, with an accent star when on', () => {
        withClient(<StarButton issue={ISSUE} />);
        expect(screen.getByRole('button', { name: 'Star' })).toHaveAttribute('aria-pressed', 'false');

        withClient(<StarButton issue={{ ...ISSUE, starred: true }} />);
        const on = screen.getByRole('button', { name: 'Starred' });
        expect(on).toHaveAttribute('aria-pressed', 'true');
        expect(on.querySelector('[aria-hidden="true"]')?.className).toContain('text-accent');
    });
});

describe('P7-A: the star while its request runs', () => {
    it('ignores a second click but stays enabled, so keyboard focus stays on it', async () => {
        const fetchMock = pendingFetch();
        withClient(<StarToggle issue={ISSUE} />);
        const star = screen.getByRole('button', { name: 'Star' });

        fireEvent.click(star);
        await waitFor(() => expect(star).toHaveAttribute('aria-disabled', 'true'));
        expect(star).not.toBeDisabled();
        fireEvent.click(star);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does the same on the header button', async () => {
        const fetchMock = pendingFetch();
        withClient(<StarButton issue={ISSUE} />);
        const button = screen.getByRole('button', { name: 'Star' });

        fireEvent.click(button);
        await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'));
        expect(button).not.toBeDisabled();
        fireEvent.click(button);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('leaves a list that has not loaded yet alone', async () => {
        pendingFetch();
        const qc = client();
        qc.setQueryData(['issues', {}], { items: [ISSUE], next: null });
        void qc.prefetchQuery({ queryKey: ['issues', { starred: 'true' }], queryFn: () => new Promise(() => {}) });
        withClient(<StarToggle issue={ISSUE} />, qc);

        fireEvent.click(screen.getByRole('button', { name: 'Star' }));

        await waitFor(() => expect(qc.getQueryData<{ items: Issue[] }>(['issues', {}])?.items[0].starred).toBe(true));
        expect(qc.getQueryData(['issues', { starred: 'true' }])).toBeUndefined();
    });
});
