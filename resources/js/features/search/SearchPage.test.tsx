import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from './SearchPage';

function wrap(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).includes('/search/issues')) {
            return new Response(JSON.stringify({ data: [
                { id: 'i1', title: 'Fix login bug', status: 'todo', priority: 'high', team_id: 't1', project_id: null, assignee_id: null, created_by: 'u', archived_at: null, created_at: '', updated_at: '', labels: [] },
            ], meta: { current_page: 1, last_page: 1 } }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }));
});

describe('SearchPage', () => {
    it('browses results on load (empty query) and highlights the query match', async () => {
        wrap(<SearchPage />);
        expect(await screen.findByText('Fix login bug')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/search/i), { target: { value: 'login' } });
        // highlighted fragment carries the accent style / a mark testid
        expect(await screen.findByTestId('hl')).toHaveTextContent('login');
    });

    it('shows the empty state when there are no results', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }), { status: 200 })));
        wrap(<SearchPage />);
        expect(await screen.findByText(/No issues match/i)).toBeInTheDocument();
    });
});

describe('Save this view', () => {
    it('opens a name input and POSTs to /saved-views with the current filters and sort, then shows a toast', async () => {
        const fetcher = vi.fn(async (url: string, opts?: { method?: string; body?: string }) => {
            if (String(url).includes('/saved-views') && opts?.method === 'POST') {
                return new Response(
                    JSON.stringify({
                        data: {
                            id: 'sv1', name: 'My Search View', created_by: 'u1',
                            definition: { filter: {}, sort: 'updated', view_type: 'list' },
                            created_at: '', updated_at: '',
                        },
                    }),
                    { status: 201 },
                );
            }
            if (String(url).includes('/saved-views')) {
                return new Response(JSON.stringify({ data: [] }), { status: 200 });
            }
            if (String(url).includes('/search/issues')) {
                return new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }), { status: 200 });
            }
            return new Response(JSON.stringify({ data: [] }), { status: 200 });
        });
        vi.stubGlobal('fetch', fetcher);
        wrap(<SearchPage />);

        fireEvent.click(screen.getByRole('button', { name: /save this view/i }));
        const nameInput = await screen.findByPlaceholderText(/view name/i);
        fireEvent.change(nameInput, { target: { value: 'My Search View' } });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => {
            const postCalls = fetcher.mock.calls.filter(
                (args: unknown[]) =>
                    String(args[0]).includes('/saved-views') &&
                    (args[1] as { method?: string } | undefined)?.method === 'POST',
            );
            expect(postCalls.length).toBeGreaterThan(0);
            const body = JSON.parse((postCalls[0][1] as { body: string }).body);
            expect(body.name).toBe('My Search View');
            expect(body.definition.view_type).toBe('list');
            expect(body.definition.sort).toBe('updated');
            expect(body.definition.filter).toEqual({});
        });

        expect(await screen.findByText(/view saved/i)).toBeInTheDocument();
    });

    it('shows inline error and keeps input open on 422', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string, opts?: { method?: string }) => {
                if (String(url).includes('/saved-views') && opts?.method === 'POST') {
                    return new Response(
                        JSON.stringify({ title: 'Error', detail: 'Name already taken.' }),
                        { status: 422 },
                    );
                }
                if (String(url).includes('/saved-views')) {
                    return new Response(JSON.stringify({ data: [] }), { status: 200 });
                }
                if (String(url).includes('/search/issues')) {
                    return new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }), { status: 200 });
                }
                return new Response(JSON.stringify({ data: [] }), { status: 200 });
            }),
        );
        wrap(<SearchPage />);

        fireEvent.click(screen.getByRole('button', { name: /save this view/i }));
        fireEvent.change(await screen.findByPlaceholderText(/view name/i), { target: { value: 'Duplicate' } });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        expect(await screen.findByText(/Name already taken/i)).toBeInTheDocument();
        // Input must remain open after error
        expect(screen.getByPlaceholderText(/view name/i)).toBeInTheDocument();
    });
});

describe('Sidebar saved views', () => {
    it('renders saved view rows and clicking one applies its definition to the search', async () => {
        const fetcher = vi.fn(async (url: string) => {
            if (String(url).includes('/saved-views')) {
                return new Response(
                    JSON.stringify({
                        data: [{
                            id: 'sv1',
                            name: 'High Priority View',
                            created_by: 'u1',
                            definition: { filter: { priority: 'high' }, sort: 'priority', view_type: 'list' },
                            created_at: '',
                            updated_at: '',
                        }],
                    }),
                    { status: 200 },
                );
            }
            if (String(url).includes('/search/issues')) {
                return new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }), { status: 200 });
            }
            return new Response(JSON.stringify({ data: [] }), { status: 200 });
        });
        vi.stubGlobal('fetch', fetcher);
        wrap(<SearchPage />);

        expect(await screen.findByText('High Priority View')).toBeInTheDocument();

        fetcher.mockClear();
        fireEvent.click(screen.getByText('High Priority View'));

        await waitFor(() => {
            const searchCalls = fetcher.mock.calls.filter((args: unknown[]) =>
                String(args[0]).includes('/search/issues'),
            );
            expect(searchCalls.length).toBeGreaterThan(0);
            // filter[priority]=high must be in the URL (URLSearchParams encodes [ as %5B, ] as %5D)
            expect(String(searchCalls[0][0])).toContain('filter%5Bpriority%5D=high');
            expect(String(searchCalls[0][0])).toContain('sort=priority');
        });
    });

    it('shows empty state when there are no saved views', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                if (String(url).includes('/saved-views')) {
                    return new Response(JSON.stringify({ data: [] }), { status: 200 });
                }
                if (String(url).includes('/search/issues')) {
                    return new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }), { status: 200 });
                }
                return new Response(JSON.stringify({ data: [] }), { status: 200 });
            }),
        );
        wrap(<SearchPage />);
        expect(await screen.findByText(/no saved views/i)).toBeInTheDocument();
    });
});
