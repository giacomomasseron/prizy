import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AcceptInvitePage from './AcceptInvitePage';

afterEach(() => vi.unstubAllGlobals());

const invitation = { email: 'sam@acme.co', workspace_name: 'Acme', inviter_name: 'Marta Rossi' };
const LINK = '/invitations/tok3n/accept';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The server's two answers: reading the invitation, and accepting it. */
function stubFetch(read: () => Response, accept: () => Response = () => json({ user: { id: 'u1' } })) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => (init?.method === 'POST' ? accept() : read()));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function open() {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[LINK]}>
                <Routes>
                    <Route path="/invitations/:token/accept" element={<AcceptInvitePage />} />
                    <Route path="/" element={<p>Home</p>} />
                    <Route path="/login" element={<p>Sign-in page</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

function fillIn() {
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Sam Lee' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Join workspace/ }));
}

it('reads the invitation from the token in the link', async () => {
    const fetchMock = stubFetch(() => json(invitation));
    open();
    await screen.findByRole('heading', { level: 1 });
    expect(String(fetchMock.mock.calls[0][0])).toBe('/invitations/tok3n');
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Accept: 'application/json' });
});

it('names the workspace and who invited them, in the auth frame', async () => {
    stubFetch(() => json(invitation));
    open();
    const title = await screen.findByRole('heading', { level: 1, name: 'Join Acme' });
    expect(title.querySelector('.hl')).not.toBeNull();
    expect(screen.getByText(/Marta Rossi invited you/)).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
});

it('still makes sense when the inviter is unknown', async () => {
    stubFetch(() => json({ ...invitation, inviter_name: null }));
    open();
    expect(await screen.findByText(/You have been invited/)).toBeInTheDocument();
});

it('shows the invited address as fixed, and asks for a name and a new password', async () => {
    stubFetch(() => json(invitation));
    open();
    const email = await screen.findByLabelText('Work email');
    expect(email).toHaveValue('sam@acme.co');
    expect(email).toHaveAttribute('readonly');
    expect(email).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Your name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
});

it('accepts with the name and password, then goes into the app', async () => {
    const fetchMock = stubFetch(() => json(invitation));
    open();
    await screen.findByRole('heading', { level: 1, name: 'Join Acme' });
    fillIn();

    expect(await screen.findByText('Home')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(String(post?.[0])).toBe(LINK);
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: 'Sam Lee', password: 'password123' });
});

it('shows field errors on 422 and keeps the form', async () => {
    stubFetch(() => json(invitation), () => json({ message: 'Invalid.', errors: { password: ['The password field must be at least 8 characters.'] } }, 422));
    open();
    await screen.findByRole('heading', { level: 1, name: 'Join Acme' });
    fillIn();

    expect(await screen.findByText('The password field must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join workspace/ })).toBeEnabled();
    expect(screen.getByLabelText('Your name')).toHaveValue('Sam Lee');
});

it('says why when the invitation closed while the page was open', async () => {
    stubFetch(() => json(invitation), () => json({ message: 'Invalid.', errors: { token: ['This invitation has expired.'] } }, 422));
    open();
    await screen.findByRole('heading', { level: 1, name: 'Join Acme' });
    fillIn();

    expect(await screen.findByText('This invitation has expired.')).toBeInTheDocument();
});

it('says to wait when rate limited', async () => {
    stubFetch(() => json(invitation), () => json({ message: 'Too Many Attempts.' }, 429));
    open();
    await screen.findByRole('heading', { level: 1, name: 'Join Acme' });
    fillIn();

    expect(await screen.findByText('Too many attempts. Try again in a minute.')).toBeInTheDocument();
});

it('says what went wrong when the request fails for another reason', async () => {
    stubFetch(() => json(invitation), () => json({ message: 'Server Error' }, 500));
    open();
    await screen.findByRole('heading', { level: 1, name: 'Join Acme' });
    fillIn();

    expect(await screen.findByText("Couldn't join the workspace. Try again.")).toBeInTheDocument();
});

it('does not offer the form for an invitation that cannot be used, and says why', async () => {
    stubFetch(() => json({ message: 'Invalid.', errors: { token: ['This invitation has expired.'] } }, 422));
    open();

    expect(await screen.findByRole('heading', { level: 1, name: "This invitation can't be used" })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This invitation has expired.');
    expect(screen.queryByRole('button', { name: /Join workspace/ })).not.toBeInTheDocument();
});

it('points to sign-in from a closed invitation', async () => {
    stubFetch(() => json({ message: 'Invalid.', errors: { token: ['You are already a member of this workspace. Sign in instead.'] } }, 422));
    open();

    fireEvent.click(await screen.findByRole('link', { name: 'sign in' }));
    await waitFor(() => expect(screen.getByText('Sign-in page')).toBeInTheDocument());
});

it('says when the invitation could not be read at all', async () => {
    stubFetch(() => json({ message: 'Server Error' }, 500));
    open();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't open this invitation. Try again.");
});
