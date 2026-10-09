import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, beforeEach } from 'vitest';
import ProjectForm from './ProjectForm';

// Mock useMembers + useCreateProject
vi.mock('../../features/members/hooks', () => ({
    useMembers: () => ({ data: [{ id: 'u1', name: 'Alice Smith' }] }),
}));
const mockMutate = vi.fn().mockResolvedValue({ id: 'p1', name: 'My Project', lead_id: 'u1', priority: 'high', color: '#6366f1', status: 'in_progress', team_id: null, start_date: null, target_date: null, description: null, icon: null, created_by: 'c1', created_at: '', updated_at: '' });
vi.mock('../../features/projects/hooks', () => ({
    useCreateProject: () => ({ mutateAsync: mockMutate, isPending: false }),
}));

beforeEach(() => {
    mockMutate.mockClear();
});

function wrap(onSuccess = vi.fn(), onCancel = vi.fn()) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return {
        onSuccess,
        onCancel,
        ...render(
            <QueryClientProvider client={qc}>
                <MemoryRouter>
                    <ProjectForm onSuccess={onSuccess} onCancel={onCancel} />
                </MemoryRouter>
            </QueryClientProvider>
        ),
    };
}

describe('ProjectForm', () => {
    it('disables Create project button when name is empty', () => {
        wrap();
        expect(screen.getByRole('button', { name: /Create project/i })).toBeDisabled();
    });

    it('enables Create project button when name is filled', async () => {
        wrap();
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        expect(screen.getByRole('button', { name: /Create project/i })).not.toBeDisabled();
    });

    it('submits with status and priority when selected', async () => {
        wrap();
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        // Select status chip 'in_progress'
        await userEvent.click(screen.getByRole('button', { name: /in.progress/i }));
        // Select priority chip 'high'
        await userEvent.click(screen.getByRole('button', { name: /high/i }));
        await userEvent.click(screen.getByRole('button', { name: /Create project/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
                name: 'My Project', status: 'in_progress', priority: 'high',
            }));
        });
    });

    it('shows all 5 status chips', () => {
        wrap();
        ['planning', 'in_progress', 'paused', 'completed', 'cancelled'].forEach(s => {
            expect(screen.getByRole('button', { name: new RegExp(s.replace('_', ' '), 'i') })).toBeInTheDocument();
        });
    });

    it('shows all 5 priority chips', () => {
        wrap();
        ['No priority', 'Low', 'Medium', 'High', 'Urgent'].forEach(p => {
            expect(screen.getByRole('button', { name: new RegExp(p, 'i') })).toBeInTheDocument();
        });
    });

    it('fires onSuccess with the created project after submit', async () => {
        const onSuccess = vi.fn();
        wrap(onSuccess);
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        await userEvent.click(screen.getByRole('button', { name: /Create project/i }));
        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', name: 'My Project' }));
        });
    });

    it('selecting a lead chip includes lead_id in the submit payload', async () => {
        wrap();
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        // Alice Smith is the only member from mock
        await userEvent.click(screen.getByRole('button', { name: /Alice Smith/i }));
        await userEvent.click(screen.getByRole('button', { name: /Create project/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'u1' }));
        });
    });

    it('a foreign/empty lead defaults to no lead (null lead_id)', async () => {
        wrap();
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        // No lead chip selected — default
        await userEvent.click(screen.getByRole('button', { name: /Create project/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ lead_id: null }));
        });
    });

    it('selecting a color chip changes the submit payload color', async () => {
        wrap();
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        // Click second color swatch (aria-label is the hex)
        const swatches = screen.getAllByRole('button', { name: /^#/i });
        await userEvent.click(swatches[1]);
        await userEvent.click(screen.getByRole('button', { name: /Create project/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
                color: swatches[1].getAttribute('aria-label'),
            }));
        });
    });

    it('Cancel button calls onCancel', async () => {
        const onCancel = vi.fn();
        wrap(vi.fn(), onCancel);
        await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(onCancel).toHaveBeenCalled();
    });

    it('shows inline error and does not call onSuccess when mutate rejects', async () => {
        const onSuccess = vi.fn();
        mockMutate.mockRejectedValueOnce(new Error('boom'));
        wrap(onSuccess);
        await userEvent.type(screen.getByPlaceholderText(/project name/i), 'My Project');
        await userEvent.click(screen.getByRole('button', { name: /Create project/i }));
        await waitFor(() => {
            expect(screen.getByText('boom')).toBeInTheDocument();
        });
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('v2: display-font name, composer chips (ink when selected), pill dates and ink-ringed swatches', () => {
        const { container } = wrap();
        expect(screen.getByPlaceholderText(/project name/i).style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByRole('button', { name: /no lead/i }).className).toContain('bg-fg');
        expect(screen.getByRole('button', { name: /high/i }).className).toContain('bg-panel');
        expect(container.querySelector('input[type="date"]')!.className).toContain('focus:border-fg');
        expect(screen.getAllByRole('button', { name: /^#/i })[0].style.boxShadow).toBe('0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg)');
    });

    it('G3b: the name, summary and timeline fields are named', () => {
        wrap();
        expect(screen.getByRole('textbox', { name: 'Project name' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Project summary' })).toBeInTheDocument();
        expect(screen.getByLabelText('Start date')).toHaveAttribute('type', 'date');
        expect(screen.getByLabelText('Target date')).toHaveAttribute('type', 'date');
    });

    it('G3b: colour swatches say which colour is selected', async () => {
        wrap();
        expect(screen.getByRole('button', { name: '#5b8def' })).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(screen.getByRole('button', { name: '#3a9a68' }));
        expect(screen.getByRole('button', { name: '#3a9a68' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: '#5b8def' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('G3b: the name field shows an ink underline while focused (no edge at rest)', () => {
        wrap();
        const name = screen.getByRole('textbox', { name: 'Project name' });
        expect(name.className).toBe('border-transparent focus:border-fg');
        expect(name.style.borderStyle).toBe('solid');
    });

    it('G3b: the summary field shows an ink underline while focused (no edge at rest)', () => {
        wrap();
        const summary = screen.getByRole('textbox', { name: 'Project summary' });
        expect(summary.className).toBe('border-transparent focus:border-fg');
        expect(summary.style.borderStyle).toBe('solid');
    });

    it('G3c: the colour swatches are a group named Colour', () => {
        wrap();
        expect(screen.getByRole('group', { name: 'Colour' })).toBeInTheDocument();
    });

    it('G3c: Cancel is a secondary button, like the dialog Cancels', () => {
        wrap();
        expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('border-border2');
    });
});
