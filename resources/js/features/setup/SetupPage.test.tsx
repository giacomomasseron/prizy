import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SetupPage from './SetupPage';

// Steps 2–3 of Setup v2, on the new workspace's host, where the login link from sign-up lands.

type Me = {
    id: string; workspace_id: string; name: string; email: string; admin_level: string;
    is_developer: boolean; is_agent: boolean; email_digest_frequency: string;
    email_verified_at: string | null; workspace: { helpdesk_enabled: boolean };
};

const owner: Me = {
    id: 'u1', workspace_id: 'w', name: 'Alice Ames', email: 'alice@acme.co', admin_level: 'owner',
    is_developer: true, is_agent: true, email_digest_frequency: 'off', email_verified_at: '2026-10-17T10:00:00Z',
    workspace: { helpdesk_enabled: true },
};
const workspace = { id: 'w', name: 'Acme', slug: 'acme', color: '#3a8f4d', helpdesk_enabled: true, member_count: 1, team_count: 0 };

const realLocation = window.location;
const assign = vi.fn();
let invites: Record<string, unknown>[] = [];

beforeEach(() => {
    invites = [];
    assign.mockReset();
    Object.defineProperty(window, 'location', { value: { assign, host: 'acme.prizy.dev' } as unknown as Location, writable: true });
});
afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** `inviteReply` answers each POST /invitations by its email; 201 when it returns nothing. */
function stubFetch(me: Partial<Me> = {}, inviteReply: (email: string) => Response | undefined = () => undefined) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/v1/me')) return json({ data: { ...owner, ...me } });
        if (url.endsWith('/v1/workspace')) return json({ data: workspace });
        if (url === '/invitations') {
            const body = JSON.parse(String(init?.body));
            invites.push(body);
            return inviteReply(body.email) ?? json({ invitation: { id: 'i', ...body } }, 201);
        }
        if (url === '/email/verification-notification') return json({ message: 'sent' }, 202);
        if (url === '/logout') return new Response(null, { status: 204 });
        return json({ data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function renderSetup() {
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={['/setup']}>
                <Routes>
                    <Route path="/setup" element={<SetupPage />} />
                    <Route path="/" element={<p>home</p>} />
                    <Route path="/today" element={<p>today page</p>} />
                    <Route path="/support" element={<p>support desk</p>} />
                    <Route path="/support/kb" element={<p>knowledge base</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

const emailInput = (n: number) => screen.getByLabelText(`Email address ${n}`);
const roleSelect = (n: number) => screen.getByLabelText(`Role for email address ${n}`) as HTMLSelectElement;

it('opens on step 2, with step 1 ticked and no way back to it', async () => {
    stubFetch();
    renderSetup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Invite your teammates' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create workspace\s*\(done\)/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /Invite your team/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('← Back')).not.toBeVisible();
    expect(screen.getByText('Invites expire after 3 days.')).toBeInTheDocument();
});

it('starts with an admin, an engineer and an agent row, and offers the four roles', async () => {
    stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');

    expect([roleSelect(1).value, roleSelect(2).value, roleSelect(3).value]).toEqual(['admin', 'member', 'agent']);
    expect(within(roleSelect(1)).getAllByRole('option').map((o) => o.textContent)).toEqual(['Admin', 'Member · engineering', 'Support agent', 'Guest']);
});

it('offers no support agent role when the workspace runs engineering only', async () => {
    stubFetch({ is_agent: false, workspace: { helpdesk_enabled: false } });
    renderSetup();
    await screen.findByText('Step 2 of 3');

    await waitFor(() => expect(roleSelect(3).value).toBe('member'));
    expect(within(roleSelect(1)).queryByRole('option', { name: 'Support agent' })).toBeNull();
});

it('counts the addresses ready, marks a malformed one, and adds a row on Enter in the last', async () => {
    stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');

    expect(screen.getByText('Add at least one to send invites')).toBeInTheDocument();
    fireEvent.change(emailInput(1), { target: { value: 'maya@acme.co' } });
    fireEvent.change(emailInput(2), { target: { value: 'not-an-email' } });
    expect(screen.getByText('1 address ready')).toBeInTheDocument();
    expect(emailInput(2)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Send 1 invite →' })).toBeEnabled();

    fireEvent.change(emailInput(3), { target: { value: 'devin@acme.co' } });
    fireEvent.keyDown(emailInput(3), { key: 'Enter' });
    expect(emailInput(4)).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Remove email address 4' }));
    expect(screen.queryByLabelText('Email address 4')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Add another' }));
    expect(roleSelect(4).value).toBe('member');
});

it('turns a pasted list into member rows, skipping blanks and repeats', async () => {
    stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');
    fireEvent.change(emailInput(1), { target: { value: 'maya@acme.co' } });

    fireEvent.change(screen.getByLabelText('Paste a list instead'), { target: { value: 'devin@acme.co, maya@acme.co\nsam@acme.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getAllByLabelText(/^Email address \d+$/).map((i) => (i as HTMLInputElement).value)).toEqual(['maya@acme.co', 'devin@acme.co', 'sam@acme.co']);
    expect([roleSelect(1).value, roleSelect(2).value, roleSelect(3).value]).toEqual(['admin', 'member', 'member']);
    expect(screen.getByLabelText('Paste a list instead')).toHaveValue('');
});

it("sends each invitation as the app's own role, then lists them as pending on step 3", async () => {
    stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');
    fireEvent.change(emailInput(1), { target: { value: 'ada@acme.co' } });
    fireEvent.change(emailInput(2), { target: { value: 'maya@acme.co' } });
    fireEvent.change(emailInput(3), { target: { value: 'sam@acme.co' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add another' }));
    fireEvent.change(emailInput(4), { target: { value: 'gus@acme.co' } });
    fireEvent.change(roleSelect(4), { target: { value: 'guest' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send 4 invites →' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Acme is ready' })).toBeInTheDocument();
    expect(invites).toEqual([
        { email: 'ada@acme.co', admin_level: 'admin', is_developer: true, is_agent: true },
        { email: 'maya@acme.co', admin_level: 'member', is_developer: true, is_agent: false },
        { email: 'sam@acme.co', admin_level: 'member', is_developer: false, is_agent: true },
        { email: 'gus@acme.co', admin_level: 'viewer', is_developer: true, is_agent: false },
    ]);
    expect(screen.getByRole('heading', { level: 2, name: '4 invitations sent' })).toBeInTheDocument();
    const maya = screen.getByText('maya@acme.co').closest('li') as HTMLElement;
    expect(within(maya).getByText('Member')).toBeInTheDocument();
    expect(within(maya).getByText('Pending')).toBeInTheDocument();
    const me = screen.getByText('(you)').closest('li') as HTMLElement;
    expect(me).toHaveTextContent('Alice Ames (you)');
    expect(within(me).getByText('Owner')).toBeInTheDocument();
    expect(within(me).getByText('Active')).toBeInTheDocument();
});

it('keeps a refused invitation on step 2 with its reason, and moves on once the rest are sent', async () => {
    stubFetch({}, (email) => (email === 'maya@acme.co' ? json({ message: 'Invalid.', errors: { email: ['The email field must be a valid email address.'] } }, 422) : undefined));
    renderSetup();
    await screen.findByText('Step 2 of 3');
    fireEvent.change(emailInput(1), { target: { value: 'ada@acme.co' } });
    fireEvent.change(emailInput(2), { target: { value: 'maya@acme.co' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send 2 invites →' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The email field must be a valid email address.');
    expect(screen.getAllByLabelText(/^Email address \d+$/).map((i) => (i as HTMLInputElement).value)).toEqual(['maya@acme.co']);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(await screen.findByRole('heading', { level: 2, name: '1 invitation sent' })).toBeInTheDocument();
    expect(screen.getByText('ada@acme.co')).toBeInTheDocument();
});

it('skipping goes to step 3 with just the owner', async () => {
    stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');

    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Just you for now — invite people any time' })).toBeInTheDocument();
    expect(invites).toEqual([]);
    expect(screen.getByText('acme.prizy.dev')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Invite your team\s*\(done\)/ })).not.toHaveAttribute('aria-disabled');
});

it('asks an owner who has not confirmed their email to do so first, and sends nothing', async () => {
    const fetchMock = stubFetch({ email_verified_at: null });
    renderSetup();
    await screen.findByText('Confirm your email first');
    fireEvent.change(emailInput(1), { target: { value: 'ada@acme.co' } });

    expect(screen.getByText('Invitations go out once you’ve opened the link we sent to alice@acme.co.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send 1 invite/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send the link again' }));
    expect(await screen.findByText('Sent. Check your inbox.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/email/verification-notification')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Acme is ready' })).toBeInTheDocument();
    expect(invites).toEqual([]);
});

it('step 3 offers the knowledge base, goes back to inviting, and opens the workspace on Today', async () => {
    stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await screen.findByText('Step 3 of 3');

    expect(screen.getByRole('link', { name: /Write your first help article/ })).toHaveAttribute('href', '/support/kb');
    fireEvent.click(screen.getByRole('button', { name: 'Invite more people' }));
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace →' }));
    expect(await screen.findByText('today page')).toBeInTheDocument();
});

it('opens a support-only workspace on the support desk, and leaves out help articles without the support side', async () => {
    stubFetch({ is_developer: false, is_agent: true });
    renderSetup();
    await screen.findByText('Step 2 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'Finish later' }));
    expect(await screen.findByText('support desk')).toBeInTheDocument();
});

it('shows no "Next" cards when the workspace runs engineering only', async () => {
    stubFetch({ is_agent: false, workspace: { helpdesk_enabled: false } });
    renderSetup();
    await screen.findByText('Step 2 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await screen.findByText('Step 3 of 3');

    expect(screen.queryByText('Next, when you have five minutes')).toBeNull();
});

it('sends anyone but the owner home', async () => {
    stubFetch({ admin_level: 'admin' });
    renderSetup();

    expect(await screen.findByText('home')).toBeInTheDocument();
});

it('signs out from the rail, to sign in as someone else', async () => {
    const fetchMock = stubFetch();
    renderSetup();
    await screen.findByText('Step 2 of 3');

    expect(screen.getByRole('link', { name: 'Setup guide ↗' })).toHaveAttribute('href', 'https://docs.prizy.dev/workspace');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to a different account' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
    expect(fetchMock.mock.calls.some(([url]) => url === '/logout')).toBe(true);
});
