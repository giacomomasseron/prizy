import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import AppLayout from './AppLayout';

function renderLayout() {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('AppLayout', () => {
    it('renders the primary navigation links', () => {
        renderLayout();
        for (const label of ['Issues', 'Board', 'Teams', 'Projects', 'Roadmap', 'Labels']) {
            expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
        }
    });
});
