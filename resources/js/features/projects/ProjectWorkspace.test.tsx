import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspace from './ProjectWorkspace';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function renderWorkspace(path: string, found = true) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/projects/')) return found ? j({ data: { id: 'p1', name: 'Escalation Engine', color: '#6d69f2', status: 'in_progress', description: null, icon: null, team_id: null, start_date: null, target_date: null, lead_id: null, priority: 'high', created_by: 'u1', created_at: '', updated_at: '' } }) : j({ message: 'Not found' }, 404);
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><Routes><Route path="/projects/:id" element={<ProjectWorkspace />}><Route path="issues" element={<div>ISSUES VIEW</div>} /><Route path="chat" element={<div>CHAT VIEW</div>} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}

describe('ProjectWorkspace', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('renders breadcrumb with the view label and the child outlet', async () => {
        renderWorkspace('/projects/p1/issues');
        expect(await screen.findByText('ISSUES VIEW')).toBeInTheDocument();
        expect(screen.getByText('Escalation Engine')).toBeInTheDocument();
        // breadcrumb view label
        expect(screen.getByText('Issues')).toBeInTheDocument();
    });
    it('P7-C: names the Chat view in the breadcrumb', async () => {
        renderWorkspace('/projects/p1/chat');
        expect(await screen.findByText('CHAT VIEW')).toBeInTheDocument();
        expect(screen.getByText('Chat')).toBeInTheDocument();
    });
    it('shows a not-found message for a missing project', async () => {
        renderWorkspace('/projects/p1', false);
        expect(await screen.findByText('Project not found.')).toBeInTheDocument();
    });
    it('v2: a 64px top bar whose left padding clears the collapsed-sidebar button; content left-aligned', async () => {
        renderWorkspace('/projects/p1/issues');
        await screen.findByText('ISSUES VIEW');
        const bar = screen.getByRole('link', { name: 'Projects' }).parentElement as HTMLElement;
        expect(bar.style.height).toBe('64px');
        expect(bar.style.padding).toContain('var(--nav-inset, 0px)');
        const content = screen.getByText('ISSUES VIEW').parentElement as HTMLElement;
        expect(content.style.maxWidth).toBe('1120px');
        expect(content.style.margin).toBe('');
    });
    it('v2: no breadcrumb piece is a heading', async () => {
        renderWorkspace('/projects/p1/issues');
        await screen.findByText('ISSUES VIEW');
        expect(screen.queryByRole('heading')).toBeNull();
    });

    it('v2: the not-found message clears the collapsed-sidebar button', async () => {
        renderWorkspace('/projects/p1', false);
        const msg = await screen.findByText('Project not found.');
        expect(msg.style.padding).toContain('var(--nav-inset, 0px)');
    });

    it('v2: a long project name in the breadcrumb truncates with an ellipsis', async () => {
        renderWorkspace('/projects/p1/issues');
        const name = await screen.findByText('Escalation Engine');
        expect(name.style.textOverflow).toBe('ellipsis');
        expect((name.parentElement as HTMLElement).style.overflow).toBe('hidden');
    });

    it("G3c: a failed project load (not a 404) shows a retryable alert, not 'not found'", async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/projects/p1']}><Routes><Route path="/projects/:id" element={<ProjectWorkspace />} /></Routes></MemoryRouter></QueryClientProvider>);
        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this project.");
        expect(screen.queryByText('Project not found.')).toBeNull();
    });
});
