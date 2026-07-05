import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InviteModal } from './InviteModal';

// ─── helpers ────────────────────────────────────────────────────────────────

function renderModal(onClose = vi.fn()) {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={qc}>
            <InviteModal open={true} onClose={onClose} />
        </QueryClientProvider>,
    );
    return { onClose };
}

afterEach(() => vi.unstubAllGlobals());

// ─── tests ──────────────────────────────────────────────────────────────────

describe('InviteModal', () => {
    // 1. Send button disabled when email empty
    it('Send button is disabled when email is empty', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /send invite/i })).toBeDisabled();
    });

    // 2. Send button disabled when level=member and no capability selected
    it('Send button is disabled when level=member and no capability selected', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        // level defaults to 'member', no capabilities selected
        expect(screen.getByRole('button', { name: /send invite/i })).toBeDisabled();
    });

    // 3. Send button enabled when level=viewer and no capability (viewer is exempt)
    it('Send button is enabled when level=viewer and no capability', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.click(screen.getByRole('button', { name: 'Viewer' }));
        expect(screen.getByRole('button', { name: /send invite/i })).not.toBeDisabled();
    });

    // 4. on submit calls POST /invitations with correct body; modal closes on success
    it('on submit calls POST /invitations with correct body and modal closes on success', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 201,
                json: async () => ({ invitation: {} }),
            }),
        );
        const onClose = vi.fn();
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        render(
            <QueryClientProvider client={qc}>
                <InviteModal open={true} onClose={onClose} />
            </QueryClientProvider>,
        );

        await user.click(screen.getByRole('button', { name: 'Viewer' }));
        await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
        await user.click(screen.getByRole('button', { name: /send invite/i }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());

        const calls = vi.mocked(fetch).mock.calls as [string, RequestInit?][];
        expect(
            calls.some(([url, init]) => {
                if (url !== '/invitations' || init?.method !== 'POST') return false;
                const body = JSON.parse(init.body as string);
                return (
                    body.email === 'new@example.com' &&
                    body.admin_level === 'viewer' &&
                    body.is_developer === false &&
                    body.is_agent === false
                );
            }),
        ).toBe(true);
    });

    // 5. no-access banner shown only for member + no capability
    it('shows no-access banner for member with no capability; hides when viewer selected', async () => {
        const user = userEvent.setup();
        renderModal();
        // Default: member + no capability → banner visible
        expect(screen.getByText(/no access to any module/i)).toBeInTheDocument();
        // Switch to viewer → banner gone
        await user.click(screen.getByRole('button', { name: 'Viewer' }));
        expect(screen.queryByText(/no access to any module/i)).not.toBeInTheDocument();
    });

    // 6. 'Owner' level option NOT rendered
    it('does not render an Owner chip', () => {
        renderModal();
        expect(screen.queryByRole('button', { name: 'Owner' })).not.toBeInTheDocument();
    });

    // 7. POST /invitations 422 → modal stays open + shows inline error text
    it('modal stays open and shows error text when POST /invitations returns 422', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 422,
                json: async () => ({
                    title: 'Validation error',
                    detail: 'Email already invited.',
                }),
            }),
        );
        const onClose = vi.fn();
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        render(
            <QueryClientProvider client={qc}>
                <InviteModal open={true} onClose={onClose} />
            </QueryClientProvider>,
        );

        await user.click(screen.getByRole('button', { name: 'Viewer' }));
        await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
        await user.click(screen.getByRole('button', { name: /send invite/i }));

        await waitFor(() =>
            expect(screen.getByText('Email already invited.')).toBeInTheDocument(),
        );
        expect(onClose).not.toHaveBeenCalled();
    });
});
