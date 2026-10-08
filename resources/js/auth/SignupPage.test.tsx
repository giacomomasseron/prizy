import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SignupPage from './SignupPage';

afterEach(() => vi.unstubAllGlobals());

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

it('shows the success message once the workspace is created', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { slug: 'acme' } }),
    }));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('slug'), { target: { value: 'acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText(/Workspace created/)).toBeInTheDocument());
    expect(screen.getByText('acme')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Workspace created');
});

it('gives the fields autofill hints, and the email field the email keyboard', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText('workspace name')).toHaveAttribute('autocomplete', 'organization');
    expect(screen.getByLabelText('name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('password')).toHaveAttribute('autocomplete', 'new-password');
});
