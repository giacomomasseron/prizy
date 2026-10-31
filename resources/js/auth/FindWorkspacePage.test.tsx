import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import FindWorkspacePage from './FindWorkspacePage';

afterEach(() => vi.unstubAllGlobals());

function answers(status: number, body: unknown) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: status < 300, status,
        headers: { get: () => 'application/json' },
        json: async () => body,
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function ask(email = 'sam@acme.co') {
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me my workspaces' }));
}

it('renders in the auth frame: title, an email field and the send button', () => {
    render(<FindWorkspacePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Find your workspace' }).querySelector('.hl')).not.toBeNull();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Work email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Work email').className).toContain('login-input');
    expect(screen.getAllByRole('main')).toHaveLength(1);
});

it('posts the address to /find-workspaces and says to check email, whatever the answer', async () => {
    const fetchMock = answers(202, { message: "If that address belongs to any workspace, we've emailed you the links." });
    render(<FindWorkspacePage />);
    ask();
    const status = await screen.findByRole('status');
    expect(within(status).getByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument();
    expect(status).toHaveTextContent("If sam@acme.co belongs to any workspace, we've sent you a link to each.");
    expect(String(fetchMock.mock.calls[0][0])).toContain('/find-workspaces');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'sam@acme.co' });
});

it('shows a field error on 422 and keeps the form', async () => {
    answers(422, { message: 'Invalid.', errors: { email: ['The email field must be a valid email address.'] } });
    render(<FindWorkspacePage />);
    // Valid to the browser's own email check, so the form reaches the server.
    ask('sam@acme');
    expect(await screen.findByText('The email field must be a valid email address.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email me my workspaces' })).toBeEnabled();
});

it('says so when this network has asked too often', async () => {
    answers(429, { message: 'Too Many Attempts.' });
    render(<FindWorkspacePage />);
    ask();
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests from this network. Try again later.');
});

it('says the email could not be sent when the server fails', async () => {
    answers(500, { message: 'Server Error' });
    render(<FindWorkspacePage />);
    ask();
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't send the email. Try again.");
});

it('points newcomers to sign-up', () => {
    render(<FindWorkspacePage />);
    expect(screen.getByRole('link', { name: 'Create a workspace' })).toHaveAttribute('href', '/');
});
