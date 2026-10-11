import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ProjectMessage } from '../../lib/types';

// P7-C: the chat card on a project's Overview (the Project v2 design).
const presence = vi.hoisted(() => ({ members: null as { id: string; name: string }[] | null }));
vi.mock('./useProjectChannel', () => ({ useProjectChannel: vi.fn(), useProjectPresence: () => presence.members }));

import { ChatCard } from './ChatCard';

function msg(n: number): ProjectMessage {
    return { id: `m${n}`, project_id: 'p1', user_id: 'me', body: `Message ${n}`, edited_at: null, created_at: new Date(2026, 9, 11, 9, n).toISOString(), issues: [] };
}

let latest: ProjectMessage[];

function j(body: unknown) {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function renderCard() {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const u = String(url);
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: 'member', is_agent: false } });
        if (u.includes('/members')) return j({ data: [{ id: 'me', name: 'Alex Rivera', is_agent: false }] });
        if (u.includes('/messages')) return j({ data: latest, links: { next: null, prev: null } });
        return j({ data: [] });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><ChatCard projectId="p1" projectName="Unified Inbox" /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
    presence.members = null;
    latest = Array.from({ length: 8 }, (_, i) => msg(8 - i)); // newest first, as the API answers
});

afterEach(() => vi.unstubAllGlobals());

describe('ChatCard', () => {
    it('shows the latest 6 messages, oldest first, with no edit controls', async () => {
        renderCard();
        const card = screen.getByRole('region', { name: 'Chat' });
        await within(card).findByText('Message 8');

        const items = within(within(card).getByRole('list', { name: 'Messages' })).getAllByRole('listitem');
        expect(items.map((li) => li.getAttribute('data-message-id'))).toEqual(['m3', 'm4', 'm5', 'm6', 'm7', 'm8']);
        await waitFor(() => expect(within(card).getByRole('combobox', { name: 'Message the Unified Inbox team' })).toBeEnabled());
        expect(within(card).queryByRole('button', { name: 'Edit' })).toBeNull();
    });

    it('opens the Chat tab from Open →', () => {
        renderCard();
        expect(screen.getByRole('link', { name: 'Open the chat' })).toHaveAttribute('href', '/projects/p1/chat');
    });

    it('hides the online count without realtime', async () => {
        renderCard();
        await screen.findByText('Message 8');
        expect(screen.queryByTestId('chat-card-online')).toBeNull();
    });

    it('counts who is online', async () => {
        presence.members = [{ id: 'me', name: 'Alex Rivera' }, { id: 'u1', name: 'Maya Chen' }];
        renderCard();
        expect(await screen.findByTestId('chat-card-online')).toHaveTextContent('2 online');
    });

    it('says hello on an empty chat', async () => {
        latest = [];
        renderCard();
        expect(await screen.findByText('No messages yet. Say hello to the team.')).toBeInTheDocument();
    });
});
