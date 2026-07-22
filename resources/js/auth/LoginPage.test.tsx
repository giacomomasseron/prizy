import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

afterEach(() => vi.restoreAllMocks());

function renderLogin() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><LoginPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

it('renders the redesigned login (Sign in button + Request access link + fields)', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Request access/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

it('shows a field error when login returns 422', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 422,
        headers: { get: () => 'application/problem+json' },
        json: async () => ({ status: 422, title: 'Unprocessable', detail: 'Invalid credentials.', errors: { email: ['These credentials do not match.'] } }),
    }));

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText(/do not match/i)).toBeInTheDocument());
});
