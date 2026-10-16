import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SignupPage from './SignupPage';

// Sign-up ends by leaving for the workspace's own host: a full page load.
const realLocation = window.location;
const assign = vi.fn();
beforeEach(() => {
    assign.mockReset();
    Object.defineProperty(window, 'location', { value: { assign } as unknown as Location, writable: true });
});
afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
});

it('v2: the login frame — brand, a display title on the highlighter, labelled fields and an ink Create button', () => {
    render(<SignupPage />);
    expect((screen.getByText('Prizy').previousElementSibling as HTMLElement).style.background).toBe('var(--fg)');
    const h1 = screen.getByRole('heading', { level: 1, name: 'Create a workspace' });
    expect(h1.style.fontFamily).toBe('var(--font-display)');
    expect(h1.querySelector('.hl')).toHaveTextContent('Create a workspace');
    for (const label of ['workspace name', 'slug', 'name', 'email', 'password']) {
        expect(screen.getByLabelText(label).className).toContain('login-input');
    }
    expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password');
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toHaveAttribute('type', 'submit');
    expect(create.className).toContain('bg-fg');
});

it('submits to /workspaces and shows field errors on 422', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: false, status: 422,
        headers: { get: () => 'application/problem+json' },
        json: async () => ({ status: 422, title: 'Unprocessable', detail: 'Invalid.', errors: { slug: ['That slug is taken.'] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('slug'), { target: { value: 'acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('That slug is taken.')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/workspaces');
});

function signedUp(body: { activation_required: boolean; workspace_url: string; login_url: string | null }) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 201,
        headers: { get: () => 'application/json' },
        json: async () => body,
    }));
}

const LOGIN_URL = 'https://acme.prizy.dev/auth/handoff?nonce=n&user=u&signature=s';

it('takes the owner to their workspace, logged in, once it is created', async () => {
    signedUp({ activation_required: false, workspace_url: 'https://acme.prizy.dev', login_url: LOGIN_URL });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('slug'), { target: { value: 'acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(LOGIN_URL));
    // While the browser leaves, say where it is going (and offer the link).
    expect(screen.getByRole('status')).toHaveTextContent('Workspace created');
    expect(screen.getByRole('status')).toHaveTextContent('Taking you to acme.prizy.dev…');
    expect(screen.getByRole('link', { name: 'acme.prizy.dev' })).toHaveAttribute('href', LOGIN_URL);
    expect(screen.getByRole('status').textContent).not.toContain('localhost');
});

it('asks the owner to check their email when the workspace waits for activation', async () => {
    signedUp({ activation_required: true, workspace_url: 'https://acme.prizy.dev', login_url: null });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'alice@acme.co' } });
    fireEvent.change(screen.getByLabelText('slug'), { target: { value: 'acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent(
        'Open the link we sent to alice@acme.co within 24 hours to activate acme.prizy.dev.',
    );
    // Not reachable yet, so no link to it.
    expect(within(screen.getByRole('status')).queryByRole('link')).toBeNull();
    expect(screen.queryByText(/Workspace created/)).toBeNull();
    expect(assign).not.toHaveBeenCalled();
});

it('points to find-your-workspace for people who already have one', () => {
    render(<SignupPage />);
    expect(screen.getByRole('link', { name: 'Find it' })).toHaveAttribute('href', '/find');
    expect(screen.getByText(/Already have a workspace\?/)).toBeInTheDocument();
});

function failsWith(status: number) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Too Many Attempts.' }),
    }));
}

it('says so when this network has made too many sign-ups, and lets the form be sent again', async () => {
    failsWith(429);
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many sign-ups from this network. Try again later.');
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
});

it('says the workspace could not be created when the server fails', async () => {
    failsWith(500);
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't create the workspace. Try again.");
});

it('shows field errors alone on a 422, and clears the form-level message on the next try', async () => {
    failsWith(500);
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText("Couldn't create the workspace. Try again.");
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 422,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Invalid.', errors: { slug: ['That address is reserved.'] } }),
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('That address is reserved.')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't create the workspace. Try again.")).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
});

it('lowercases the slug as it is typed, since it becomes a hostname', () => {
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('slug'), { target: { value: 'Acme-Corp' } });
    expect(screen.getByLabelText('slug')).toHaveValue('acme-corp');
    // Only the slug: the other fields keep what was typed.
    fireEvent.change(screen.getByLabelText('workspace name'), { target: { value: 'Acme Corp' } });
    expect(screen.getByLabelText('workspace name')).toHaveValue('Acme Corp');
});

it('gives the fields autofill hints, and the email field the email keyboard', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText('workspace name')).toHaveAttribute('autocomplete', 'organization');
    expect(screen.getByLabelText('name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('password')).toHaveAttribute('autocomplete', 'new-password');
});

it('G3c: the signup page renders exactly one main landmark', () => {
    render(<SignupPage />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
});

it('G3c: Create is disabled while the request runs and enabled again after a failure', async () => {
    let fail: (v: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => { fail = r; })));
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled());
    fail({
        ok: false, status: 422,
        headers: { get: () => 'application/problem+json' },
        json: async () => ({ status: 422, title: 'Unprocessable', detail: 'Invalid.', errors: { slug: ['Taken.'] } }),
    });
    expect(await screen.findByText('Taken.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
});
