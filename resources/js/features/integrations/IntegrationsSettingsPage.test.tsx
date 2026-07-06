import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IntegrationsSettingsPage from './IntegrationsSettingsPage';

const disconnectSlack = vi.fn();
let slackData: unknown = { configured: true, is_active: true, events: ['created', 'assigned'], url_preview: '…tok' };
let slackIsError = false;
const githubData = { configured: false, is_active: false, move_to_done_on_merge: true, webhook_url: null, secret_set: false };

vi.mock('./hooks', () => ({
    useSlackIntegration: () => ({ isLoading: false, isError: slackIsError, data: slackData }),
    useGithubIntegration: () => ({ isLoading: false, data: githubData }),
    useDisconnectSlack: () => ({ mutate: disconnectSlack }),
    useDisconnectGithub: () => ({ mutate: vi.fn() }),
    // drawers read these; the page mounts the drawers which call them, so stub them too:
    useSaveSlackIntegration: () => ({ mutateAsync: vi.fn() }),
    useSendSlackTest: () => ({ mutateAsync: vi.fn() }),
    useSaveGithubIntegration: () => ({ mutateAsync: vi.fn() }),
}));

describe('IntegrationsSettingsPage', () => {
    it('shows Slack as Connected (badge + meta) and GitHub as Available; renders coming-soon cards', () => {
        render(<IntegrationsSettingsPage />);
        expect(screen.getByTestId('manage-slack')).toBeInTheDocument();     // connected → Manage
        expect(screen.getByTestId('disconnect-slack')).toBeInTheDocument();
        expect(screen.getByText('2 events')).toBeInTheDocument();           // derived meta
        expect(screen.getByTestId('connect-github')).toBeInTheDocument();   // available → Connect
        expect(screen.getByTestId('soon-figma')).toBeInTheDocument();       // coming-soon
        expect(screen.queryByTestId('connect-figma')).toBeNull();           // no Connect on coming-soon
    });

    it('opens the Slack drawer via Manage and disconnects with confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<IntegrationsSettingsPage />);
        fireEvent.click(screen.getByTestId('manage-slack'));
        expect(screen.getByLabelText('Slack webhook URL')).toBeInTheDocument(); // drawer opened
        fireEvent.click(screen.getByTestId('disconnect-slack'));
        await waitFor(() => expect(disconnectSlack).toHaveBeenCalled());
    });
});

it('shows an error banner when a show query fails', () => {
    slackIsError = true;
    render(<IntegrationsSettingsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t load/i);
    slackIsError = false;
});
