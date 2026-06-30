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

it('shows a field error when login returns 422', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 422,
        headers: { get: () => 'application/problem+json' },
        json: async () => ({ status: 422, title: 'Unprocessable', detail: 'Invalid credentials.', errors: { email: ['These credentials do not match.'] } }),
    }));

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(screen.getByText(/do not match/i)).toBeInTheDocument());
});
