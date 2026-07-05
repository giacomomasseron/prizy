import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import CreateScreen from './CreateScreen';

// Mock child forms so this test is isolated to shell behaviour
vi.mock('./ProjectForm', () => ({
    default: ({ onSuccess }: { onSuccess: (p: any) => void }) => (
        <button
            onClick={() =>
                onSuccess({
                    id: '1',
                    name: 'P1',
                    lead_id: null,
                    priority: 'no_priority',
                    color: '#6366f1',
                    status: 'planning',
                    team_id: null,
                    start_date: null,
                    target_date: null,
                    description: null,
                    icon: null,
                    created_by: 'u1',
                    created_at: '',
                    updated_at: '',
                })
            }
        >
            submit-project
        </button>
    ),
}));

vi.mock('./CycleForm', () => ({
    default: ({ onSuccess }: { onSuccess: (c: any, tid: string) => void }) => (
        <button
            onClick={() =>
                onSuccess(
                    {
                        id: '2',
                        name: 'C1',
                        team_id: 't1',
                        starts_at: '',
                        ends_at: '',
                        cooldown_days: 0,
                        created_at: '',
                        updated_at: '',
                    },
                    't1',
                )
            }
        >
            submit-cycle
        </button>
    ),
}));

function wrap(url = '/create') {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path="/create" element={<CreateScreen />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

/** Renders with a LocationSpy so tests can assert on the current search string. */
function LocationSpy() {
    const { search } = useLocation();
    return <span data-testid="loc-search">{search}</span>;
}

function wrapWithSpy(url = '/create') {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path="/create" element={<CreateScreen />} />
                </Routes>
                <LocationSpy />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('CreateScreen shell', () => {
    it('renders the tab switcher with New project + New cycle', () => {
        wrap();
        expect(screen.getByText('New project')).toBeInTheDocument();
        expect(screen.getByText('New cycle')).toBeInTheDocument();
    });

    it('defaults to the project tab', () => {
        wrap();
        expect(screen.getByText('submit-project')).toBeInTheDocument();
    });

    it('switches to cycle tab when ?tab=cycle', () => {
        wrap('/create?tab=cycle');
        expect(screen.getByText('submit-cycle')).toBeInTheDocument();
    });

    it('shows success card after project form succeeds', async () => {
        wrap();
        await userEvent.click(screen.getByText('submit-project'));
        expect(screen.getByText(/P1/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create another/i })).toBeInTheDocument();
    });

    it('"Create another" resets to the form', async () => {
        wrap();
        await userEvent.click(screen.getByText('submit-project'));
        await userEvent.click(screen.getByRole('button', { name: /Create another/i }));
        expect(screen.getByText('submit-project')).toBeInTheDocument();
    });

    it('clicking "New cycle" updates URL to ?tab=cycle and renders CycleForm', async () => {
        wrapWithSpy('/create');
        // starts on project tab
        expect(screen.getByText('submit-project')).toBeInTheDocument();

        await userEvent.click(screen.getByText('New cycle'));

        // CycleForm stub is now rendered
        expect(screen.getByText('submit-cycle')).toBeInTheDocument();
        expect(screen.queryByText('submit-project')).not.toBeInTheDocument();
        // URL must reflect the tab switch
        expect(screen.getByTestId('loc-search').textContent).toBe('?tab=cycle');
    });

    it('clicking "New project" after cycle updates URL to ?tab=project and renders ProjectForm', async () => {
        wrapWithSpy('/create?tab=cycle');
        // starts on cycle tab
        expect(screen.getByText('submit-cycle')).toBeInTheDocument();

        await userEvent.click(screen.getByText('New project'));

        // ProjectForm stub is now rendered
        expect(screen.getByText('submit-project')).toBeInTheDocument();
        expect(screen.queryByText('submit-cycle')).not.toBeInTheDocument();
        // URL must reflect the tab switch
        expect(screen.getByTestId('loc-search').textContent).toBe('?tab=project');
    });
});
