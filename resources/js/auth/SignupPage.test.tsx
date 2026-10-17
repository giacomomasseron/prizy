import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SignupPage from './SignupPage';

// Sign-up is step 1 of the Setup v2 wizard, on the sign-up host. It ends by leaving for the workspace's own host
// (a full page load), where /setup carries on.

type CheckReply = { available: boolean; reason: string | null; message: string | null } | 'fail';

const realLocation = window.location;
const assign = vi.fn();
let meta: HTMLMetaElement;

beforeEach(() => {
    assign.mockReset();
    Object.defineProperty(window, 'location', { value: { assign } as unknown as Location, writable: true });
    meta = document.createElement('meta');
    meta.name = 'prizy-base-domain';
    meta.content = 'prizy.dev';
    document.head.appendChild(meta);
});
afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
    meta.remove();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Answers the live slug check with `check`, and the sign-up POST with `signup` (pending forever when not given). */
function stubFetch(options: { check?: (slug: string) => CheckReply; signup?: () => Response | Promise<Response> } = {}) {
    const fetchMock = vi.fn(async (url: string) => {
        if (url.startsWith('/workspaces/slug-check')) {
            const slug = new URL(url, 'https://signup.prizy.dev').searchParams.get('slug') ?? '';
            const reply = options.check ? options.check(slug) : { available: true, reason: null, message: null };
            return reply === 'fail' ? json({ message: 'Too Many Attempts.' }, 429) : json(reply);
        }
        if (url === '/workspaces') return options.signup ? options.signup() : new Promise<Response>(() => {});
        return json({});
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function signupBody(fetchMock: ReturnType<typeof stubFetch>) {
    const call = fetchMock.mock.calls.find(([url]) => url === '/workspaces') as unknown as [string, RequestInit];
    return JSON.parse(String(call[1].body));
}

async function fillValid(name = 'Acme') {
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: name } });
    await screen.findByText('available');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alice Ames' } });
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'alice@acme.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
}

const continueButton = () => screen.getByRole('button', { name: /^(Continue →|Creating…)$/ });

it('draws step 1 of the setup frame: the rail, "Step 1 of 3", the highlighted title and no "Finish later"', () => {
    stubFetch();
    render(<SignupPage />);

    expect(screen.getByText('setup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Get Prizy running' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create workspace/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Invite your team/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    const h1 = screen.getByRole('heading', { level: 1, name: 'Create your workspace' });
    expect(h1.querySelector('.hl')).toHaveTextContent('Create your workspace');
    expect(screen.queryByRole('button', { name: 'Finish later' })).toBeNull();
    expect(screen.getAllByRole('main')).toHaveLength(1);
});

it('links to the setup guide and to find-your-workspace from the rail', () => {
    stubFetch();
    render(<SignupPage />);

    expect(screen.getByRole('link', { name: 'Setup guide ↗' })).toHaveAttribute('href', 'https://docs.prizy.dev/workspace');
    expect(screen.getByRole('link', { name: 'Find your workspace' })).toHaveAttribute('href', '/find');
});

it('fills the URL in from the name until the URL itself is edited', () => {
    stubFetch();
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Northwind Traders' } });
    expect(screen.getByLabelText('Workspace URL')).toHaveValue('northwind-traders');

    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'NW-' } });
    expect(screen.getByLabelText('Workspace URL')).toHaveValue('nw-');
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Northwind' } });
    expect(screen.getByLabelText('Workspace URL')).toHaveValue('nw-');
});

it('shows the URL under the base domain, as a placeholder and once it is free', async () => {
    stubFetch();
    render(<SignupPage />);

    expect(screen.getByLabelText('Workspace URL')).toHaveAttribute('placeholder', 'northwind.prizy.dev');
    expect(screen.getByText('Lowercase letters, numbers and dashes.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'northwind' } });
    expect(await screen.findByText('available')).toBeInTheDocument();
    expect(screen.getByText('Everyone reaches your workspace at northwind.prizy.dev.')).toBeInTheDocument();
});

it('calls a URL under three characters too short without asking the server', async () => {
    const fetchMock = stubFetch();
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'ab' } });
    expect(screen.getByText('too short')).toBeInTheDocument();
    expect(screen.getByText('Workspace URLs need at least three characters.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
});

it('says a taken URL is taken and suggests another', async () => {
    stubFetch({ check: () => ({ available: false, reason: 'taken', message: null }) });
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'acme' } });
    expect(await screen.findByText('taken')).toBeInTheDocument();
    expect(screen.getByText('That URL belongs to another workspace. Try acme-hq.')).toBeInTheDocument();
});

it("shows the server's reason for a reserved or malformed URL", async () => {
    stubFetch({
        check: (slug) => (slug === 'admin'
            ? { available: false, reason: 'reserved', message: 'That address is reserved.' }
            : { available: false, reason: 'invalid', message: 'Use 3–63 lowercase letters.' }),
    });
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'admin' } });
    expect(await screen.findByText('reserved')).toBeInTheDocument();
    expect(screen.getByText('That address is reserved.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'north-' } });
    expect(await screen.findByText('invalid')).toBeInTheDocument();
    expect(screen.getByText('Use 3–63 lowercase letters.')).toBeInTheDocument();
});

it('keeps Continue off until the workspace has a name and a free URL', async () => {
    stubFetch({ check: (slug) => (slug === 'acme' ? { available: false, reason: 'taken', message: null } : { available: true, reason: null, message: null }) });
    render(<SignupPage />);

    expect(continueButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Acme' } });
    await screen.findByText('taken');
    expect(continueButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Workspace URL'), { target: { value: 'acme-hq' } });
    await screen.findByText('available');
    expect(continueButton()).toBeEnabled();
});

it('lets the person continue when the check itself fails, since sign-up checks again', async () => {
    stubFetch({ check: () => 'fail' });
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Acme' } });
    await waitFor(() => expect(continueButton()).toBeEnabled());
    expect(screen.queryByText('available')).toBeNull();
});

it('draws the mark from the name on the picked colour, and sends the colour and usage with the account', async () => {
    const fetchMock = stubFetch({ signup: () => json({ activation_required: true, workspace_url: 'https://acme.prizy.dev', login_url: null }, 201) });
    render(<SignupPage />);
    await fillValid('acme');

    const mark = screen.getByRole('group', { name: 'Workspace mark' });
    expect(within(mark).getByText('A')).toBeInTheDocument();
    expect(within(mark).getByRole('button', { name: 'Indigo' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(mark).getByRole('button', { name: 'Green' }));
    expect(within(mark).getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true');
    expect((within(mark).getByText('A') as HTMLElement).style.background).toBe('rgb(58, 143, 77)');

    const usage = screen.getByRole('group', { name: 'What will this workspace run?' });
    expect(within(usage).getByRole('button', { name: /Both/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(usage).getByRole('button', { name: /Engineering/ }));
    expect(within(usage).getByRole('button', { name: /Engineering/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(continueButton());
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/workspaces')).toBe(true));
    expect(signupBody(fetchMock)).toEqual({
        workspace_name: 'acme', slug: 'acme', color: '#3a8f4d', usage: 'engineering',
        name: 'Alice Ames', email: 'alice@acme.co', password: 'password123',
    });
});

const LOGIN_URL = 'https://acme.prizy.dev/auth/handoff?nonce=n&user=u&signature=s';

it('takes the owner to their workspace, logged in, once it is created', async () => {
    stubFetch({ signup: () => json({ activation_required: false, workspace_url: 'https://acme.prizy.dev', login_url: LOGIN_URL }, 201) });
    render(<SignupPage />);
    await fillValid();
    fireEvent.click(continueButton());

    await waitFor(() => expect(assign).toHaveBeenCalledWith(LOGIN_URL));
    // While the browser leaves, say where it is going (and offer the link).
    expect(screen.getByRole('status')).toHaveTextContent('Workspace created');
    expect(screen.getByRole('status')).toHaveTextContent('Taking you to acme.prizy.dev…');
    expect(screen.getByRole('link', { name: 'acme.prizy.dev' })).toHaveAttribute('href', LOGIN_URL);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
});

it('asks the owner to check their email when the workspace waits for activation', async () => {
    stubFetch({ signup: () => json({ activation_required: true, workspace_url: 'https://acme.prizy.dev', login_url: null }, 201) });
    render(<SignupPage />);
    await fillValid();
    fireEvent.click(continueButton());

    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
        'Open the link we sent to alice@acme.co within 24 hours to activate acme.prizy.dev. Then you can invite your team.',
    );
    // Not reachable yet, so no link to it, and nothing to press.
    expect(within(screen.getByRole('status')).queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(assign).not.toHaveBeenCalled();
});

it('shows field errors under their fields on a 422, and Continue works again', async () => {
    stubFetch({ signup: () => json({ message: 'Invalid.', errors: { slug: ['That slug is taken.'], email: ['The email field must be a valid email address.'] } }, 422) });
    render(<SignupPage />);
    await fillValid();
    fireEvent.click(continueButton());

    expect(await screen.findByText('That slug is taken.')).toHaveAttribute('role', 'alert');
    expect(screen.getByText('The email field must be a valid email address.')).toHaveAttribute('role', 'alert');
    expect(continueButton()).toBeEnabled();
});

it('says so when this network has made too many sign-ups', async () => {
    stubFetch({ signup: () => json({ message: 'Too Many Attempts.' }, 429) });
    render(<SignupPage />);
    await fillValid();
    fireEvent.click(continueButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many sign-ups from this network. Try again later.');
    expect(continueButton()).toBeEnabled();
});

it('says the workspace could not be created when the server fails, and clears that on the next try', async () => {
    let status = 500;
    stubFetch({ signup: () => (status === 500 ? json({ message: 'Server Error' }, 500) : json({ message: 'Invalid.', errors: { password: ['Too short.'] } }, 422)) });
    render(<SignupPage />);
    await fillValid();
    fireEvent.click(continueButton());
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't create the workspace. Try again.");

    status = 422;
    fireEvent.click(continueButton());
    expect(await screen.findByText('Too short.')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't create the workspace. Try again.")).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
});

it('keeps Continue off while the request runs', async () => {
    stubFetch();
    render(<SignupPage />);
    await fillValid();
    fireEvent.click(continueButton());

    await waitFor(() => expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled());
});

it('gives the fields autofill hints, and the email and password fields their types', () => {
    stubFetch();
    render(<SignupPage />);

    expect(screen.getByLabelText('Workspace name')).toHaveAttribute('autocomplete', 'organization');
    expect(screen.getByLabelText('Workspace URL')).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByLabelText('Your name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Work email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Work email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
});
