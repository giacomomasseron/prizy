import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlackConfigDrawer } from './SlackConfigDrawer';
import { GithubConfigDrawer } from './GithubConfigDrawer';

const slackSave = vi.fn().mockResolvedValue(undefined);
const slackTest = vi.fn().mockResolvedValue(undefined);
const ghSave = vi.fn().mockResolvedValue(undefined);
// Stable references — the drawers sync data → local state via useEffect([data]); a
// fresh object literal per call would make [data] change every render → infinite loop.
const slackData = { configured: false, is_active: true, events: [], url_preview: null };
const githubData = { configured: true, is_active: true, move_to_done_on_merge: true, webhook_url: 'https://x/integrations/github/webhook/abc', secret_set: true };

vi.mock('./hooks', () => ({
    useSlackIntegration: () => ({ data: slackData }),
    useSaveSlackIntegration: () => ({ mutateAsync: slackSave }),
    useSendSlackTest: () => ({ mutateAsync: slackTest }),
    useGithubIntegration: () => ({ data: githubData }),
    useSaveGithubIntegration: () => ({ mutateAsync: ghSave }),
}));

describe('SlackConfigDrawer', () => {
    it('saves the webhook + events and can send a test', async () => {
        render(<SlackConfigDrawer open onClose={() => {}} />);
        fireEvent.change(screen.getByLabelText('Slack webhook URL'), { target: { value: 'https://hooks.slack.com/services/A/B/c' } });
        fireEvent.click(screen.getByLabelText('Assigned'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(slackSave).toHaveBeenCalledWith(expect.objectContaining({ webhook_url: 'https://hooks.slack.com/services/A/B/c', events: ['assigned'] })));
        await screen.findByText('Saved');
        fireEvent.click(screen.getByRole('button', { name: 'Send test' }));
        await waitFor(() => expect(slackTest).toHaveBeenCalled());
    });
    it('renders nothing when closed', () => {
        render(<SlackConfigDrawer open={false} onClose={() => {}} />);
        expect(screen.queryByLabelText('Slack webhook URL')).toBeNull();
    });
});

describe('GithubConfigDrawer', () => {
    it('shows the readonly webhook URL and saves', async () => {
        render(<GithubConfigDrawer open onClose={() => {}} />);
        expect(screen.getByLabelText('GitHub webhook URL')).toHaveValue('https://x/integrations/github/webhook/abc');
        fireEvent.change(screen.getByLabelText('GitHub webhook secret'), { target: { value: 's3cret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save GitHub' }));
        await waitFor(() => expect(ghSave).toHaveBeenCalledWith(expect.objectContaining({ webhook_secret: 's3cret' })));
        await screen.findByText('Saved');
    });
});
