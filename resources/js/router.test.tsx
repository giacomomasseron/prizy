import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AppRouter from './router';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
        ok: false, status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Unauthenticated.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    document.head.querySelectorAll('meta[name="prizy-signup-url"]').forEach((m) => m.remove());
});

function signupHostIs(url: string) {
    const meta = document.createElement('meta');
    meta.name = 'prizy-signup-url';
    meta.content = url;
    document.head.append(meta);
}

function Path() {
    return <output data-testid="path">{useLocation().pathname}</output>;
}

function open(path: string) {
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={[path]}>
                <AppRouter />
                <Path />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

const thisHost = () => `https://${window.location.hostname}`;
const signupForm = () => screen.findByRole('button', { name: /Create workspace/i });

it('shows the sign-up page at the root of the sign-up host, with no redirect and no session check', async () => {
    signupHostIs(thisHost());
    open('/');

    expect(await signupForm()).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/);
    expect(fetchMock).not.toHaveBeenCalled();
});

it('moves an old /signup link on the sign-up host to the root', async () => {
    signupHostIs(thisHost());
    open('/signup');

    expect(await signupForm()).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/));
});

it('keeps a workspace host root behind sign-in', async () => {
    signupHostIs('https://signup.prizy.dev');
    open('/');

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/login'));
});

it('leaves /signup where it is on a workspace host', async () => {
    signupHostIs('https://signup.prizy.dev');
    open('/signup');

    expect(await signupForm()).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/signup');
});
