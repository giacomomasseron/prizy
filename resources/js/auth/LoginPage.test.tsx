import { readFileSync } from 'fs';
import { resolve } from 'path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

afterEach(() => vi.restoreAllMocks());

function renderLogin() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><LoginPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

it('renders the redesigned login (Sign in button + Create a workspace link + fields)', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create a workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', 'https://prizy.dev/privacy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', 'https://prizy.dev/terms');
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

it('v2: brand mark, a display title on the highlighter and a full-width ink submit', () => {
    renderLogin();
    const brand = screen.getByText('Prizy');
    expect((brand.previousElementSibling as HTMLElement).style.background).toBe('var(--fg)');
    const h1 = screen.getByRole('heading', { level: 1, name: 'Welcome back' });
    expect(h1.style.fontFamily).toBe('var(--font-display)');
    expect(h1.querySelector('.hl')).toHaveTextContent('Welcome back');
    const submit = screen.getByRole('button', { name: /sign in/i });
    expect(submit).toHaveAttribute('type', 'submit');
    expect(submit.className).toContain('bg-fg');
    expect(submit.style.width).toBe('100%');
    const email = screen.getByLabelText(/email/i);
    expect(email.className).toContain('login-input');
    expect(email.style.borderRadius).toBe('14px');
    expect(email.style.background).toBe('var(--panel)');
    expect(screen.getByRole('link', { name: /Create a workspace/i }).className).toContain('hover:text-accent');
});

it('v2: ships no controls the backend cannot honour', () => {
    renderLogin();
    expect(screen.queryByRole('button', { name: /google|sso|saml/i })).toBeNull();
    expect(screen.queryByText(/forgot/i)).toBeNull();
    expect(screen.queryByLabelText(/keep me signed in/i)).toBeNull();
    expect(screen.queryByText(/or with email/i)).toBeNull();
});

it('v2: the decorative panel is light, hidden from assistive tech and carries no invented testimonial', () => {
    const { container } = renderLogin();
    const aside = container.querySelector('aside') as HTMLElement;
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside.style.background).toBe('var(--bg2)');
    expect(aside).toHaveTextContent('Escalations');
    expect(aside).not.toHaveTextContent(/Leon K/);
});

it('v2: the decorative panel never scrolls, and overflow clips its bottom rather than its top', () => {
    const { container } = renderLogin();
    const aside = container.querySelector('aside') as HTMLElement;
    expect(aside.style.overflow).toBe('hidden');
    expect(aside.style.justifyContent).toBe('');
    expect((aside.firstElementChild as HTMLElement).style.margin).toBe('auto');
});

it('v2: the auth files carry no fixed hex or rgb(a) colours', () => {
    // Checked on the source: jsdom rewrites inline hex as rgb(), so a rendered-DOM check would miss most of them.
    for (const f of ['LoginPage.tsx', 'SignupPage.tsx', 'authStyles.ts', 'AuthChrome.tsx']) {
        expect(readFileSync(resolve(__dirname, f), 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    }
});

it('G3c: the login page renders exactly one main landmark', () => {
    renderLogin();
    expect(screen.getAllByRole('main')).toHaveLength(1);
});
