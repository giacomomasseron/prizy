import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateTeamModal from './CreateTeamModal';

function wrap(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('CreateTeamModal', () => {
    it('auto-suggests an identifier from the name and posts', async () => {
        const calls: string[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            calls.push(String(url));
            return new Response(JSON.stringify({ data: { id: 't9', name: 'Platform', identifier: 'PLA', color: '#6366f1' } }), { status: 201 });
        }));
        const onClose = vi.fn();
        wrap(<CreateTeamModal open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText(/team name/i), { target: { value: 'Platform' } });
        expect((screen.getByLabelText(/identifier/i) as HTMLInputElement).value).toBe('PLA');
        fireEvent.click(screen.getByRole('button', { name: /create team/i }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls.some((u) => u.includes('/teams'))).toBe(true);
    });

    it('shows an inline error on 422 and stays open', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ title: 'Unprocessable', detail: 'Identifier already taken.' }), { status: 422 })));
        const onClose = vi.fn();
        wrap(<CreateTeamModal open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText(/team name/i), { target: { value: 'Eng' } });
        fireEvent.click(screen.getByRole('button', { name: /create team/i }));
        expect(await screen.findByText('Identifier already taken.')).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});
