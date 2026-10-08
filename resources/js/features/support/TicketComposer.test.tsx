import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketComposer } from './TicketComposer';
import { ApiError } from '../../lib/apiClient';
import type { TicketDetail } from '../../lib/types';

const postMutateAsync = vi.fn();
const changeMutate = vi.fn();
let postPending = false;

vi.mock('./hooks', () => ({
    usePostTicketMessage: () => ({ mutateAsync: postMutateAsync, isPending: postPending }),
    useChangeTicketStatus: () => ({ mutate: changeMutate, isPending: false }),
}));

function ticket(over: Partial<TicketDetail> = {}): TicketDetail {
    return {
        id: 't1', subject: 'S', status: 'open', priority: 'normal', channel: 'email',
        requester: null, assignee: null, tags: [], linked_issues: [],
        sla_metrics: [], updated_at: '', created_at: '',
        first_replied_at: null, resolved_at: null, messages: [], requester_history: [], ...over,
    };
}

beforeEach(() => {
    postMutateAsync.mockReset().mockResolvedValue(undefined);
    changeMutate.mockReset();
    postPending = false;
});

describe('TicketComposer', () => {
    it('disables the send button until the draft is non-empty', () => {
        render(<TicketComposer ticket={ticket()} />);
        const send = screen.getByRole('button', { name: /Submit as/ });
        expect(send).toBeDisabled();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
        expect(send).toBeEnabled();
    });

    it('labels the public send button with the next status', () => {
        render(<TicketComposer ticket={ticket({ status: 'open' })} />);
        // open → pending
        expect(screen.getByRole('button', { name: 'Submit as Pending' })).toBeInTheDocument();
    });

    it('posts a public reply then advances status', async () => {
        render(<TicketComposer ticket={ticket({ status: 'open' })} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A reply' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit as Pending' }));
        await vi.waitFor(() => expect(postMutateAsync).toHaveBeenCalledWith({ body: 'A reply', internal: false }));
        expect(changeMutate).toHaveBeenCalledWith('pending');
    });

    it('appends a macro to the draft', () => {
        render(<TicketComposer ticket={ticket()} />);
        fireEvent.click(screen.getByRole('button', { name: '⚡ Ask for details' }));
        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain('a few more details');
    });

    it('adds an internal note without changing status', async () => {
        render(<TicketComposer ticket={ticket({ status: 'open' })} />);
        fireEvent.click(screen.getByRole('button', { name: 'Internal note' }));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'private note' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
        await vi.waitFor(() => expect(postMutateAsync).toHaveBeenCalledWith({ body: 'private note', internal: true }));
        expect(changeMutate).not.toHaveBeenCalled();
    });

    it('shows an error banner when the post fails', async () => {
        postMutateAsync.mockRejectedValue(new ApiError(422, 'Unprocessable', 'Body is required'));
        render(<TicketComposer ticket={ticket()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit as/ }));
        expect(await screen.findByText('Body is required')).toBeInTheDocument();
    });

    it('clears the draft after a successful public reply (even with trailing whitespace)', async () => {
        render(<TicketComposer ticket={ticket({ status: 'open' })} />);
        const box = screen.getByRole('textbox') as HTMLTextAreaElement;
        fireEvent.change(box, { target: { value: 'All done here\n' } }); // trailing newline guards the trim comparison
        fireEvent.click(screen.getByRole('button', { name: 'Submit as Pending' }));
        await vi.waitFor(() => expect(box.value).toBe(''));
    });

    it('does not wipe a note typed while the reply request is still in flight', async () => {
        let resolvePost: (() => void) | undefined;
        postMutateAsync.mockImplementation(() => new Promise<void>((r) => { resolvePost = () => r(); }));
        render(<TicketComposer ticket={ticket({ status: 'open' })} />);
        const box = screen.getByRole('textbox') as HTMLTextAreaElement;
        fireEvent.change(box, { target: { value: 'public reply' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit as Pending' }));
        // agent switches to the note tab and types before the reply resolves
        fireEvent.click(screen.getByRole('button', { name: 'Internal note' }));
        fireEvent.change(box, { target: { value: 'a fresh note' } });
        resolvePost!();
        await vi.waitFor(() => expect(postMutateAsync).toHaveBeenCalled());
        expect(box.value).toBe('a fresh note'); // the in-flight success must not clear the new draft
    });

    it('v2: pill tabs with aria-pressed; the active tab is white and its label stays ink', () => {
        render(<TicketComposer ticket={ticket()} />);
        const pub = screen.getByRole('button', { name: 'Public reply' });
        expect(pub).toHaveAttribute('aria-pressed', 'true');
        expect(pub.style.background).toBe('var(--panel)');
        expect(pub.style.color).toBe('var(--fg)');
        fireEvent.click(screen.getByRole('button', { name: 'Internal note' }));
        expect(screen.getByRole('button', { name: 'Internal note' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByTestId('composer-box').style.border).toBe('var(--line) solid var(--note)');
    });

    it('v2: the send button is the ink Button, label unchanged; the reply box keeps the mode border', () => {
        render(<TicketComposer ticket={ticket()} />);
        const send = screen.getByRole('button', { name: /Submit as/ });
        expect(send.className).toContain('bg-fg');
        expect(send.style.background).toBe('');
        expect(screen.getByTestId('composer-box').style.border).toBe('var(--line) solid var(--sup)');
        expect(screen.getByTestId('composer-box').style.borderRadius).toBe('var(--radius-card)');
    });

    it('v2: the error box tints from the red token, with no rgba fallback', async () => {
        postMutateAsync.mockRejectedValue(new ApiError(422, 'Error', 'Could not send.'));
        render(<TicketComposer ticket={ticket()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit as/ }));
        const alert = await screen.findByRole('alert');
        expect(alert.style.background).toBe('color-mix(in srgb, var(--red) 10%, transparent)');
        expect(alert.getAttribute('style')).not.toMatch(/rgba/);
    });

    it('v2: only the active tab\'s dot is full strength, so the dot marks the mode', () => {
        render(<TicketComposer ticket={ticket()} />);
        const dotOf = (name: string) => screen.getByRole('button', { name }).querySelector<HTMLElement>('span[aria-hidden="true"]')!;
        expect(dotOf('Public reply').style.opacity).toBe('1');
        expect(dotOf('Internal note').style.opacity).toBe('0.35');
        fireEvent.click(screen.getByRole('button', { name: 'Internal note' }));
        expect(dotOf('Public reply').style.opacity).toBe('0.35');
        expect(dotOf('Internal note').style.opacity).toBe('1');
    });
});
