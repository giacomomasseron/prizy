import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GithubIntegration, SlackIntegration } from '../../lib/types';
import { SlackConfigDrawer } from './SlackConfigDrawer';
import { GithubConfigDrawer } from './GithubConfigDrawer';

const slackSave = vi.fn().mockResolvedValue(undefined);
const slackTest = vi.fn().mockResolvedValue(undefined);
const ghSave = vi.fn().mockResolvedValue(undefined);

// Mutable module-level refs — reassign BEFORE render() only, never during.
// Keeping the same object reference within a render cycle prevents the
// useEffect([data]) infinite loop caused by a new object on every hook call.
let slackData: SlackIntegration;
let githubData: GithubIntegration;

vi.mock('./hooks', () => ({
    useSlackIntegration: () => ({ data: slackData }),
    useSaveSlackIntegration: () => ({ mutateAsync: slackSave }),
    useSendSlackTest: () => ({ mutateAsync: slackTest }),
    useGithubIntegration: () => ({ data: githubData }),
    useSaveGithubIntegration: () => ({ mutateAsync: ghSave }),
}));

beforeEach(() => {
    slackData = { configured: false, is_active: true, events: [], url_preview: null };
    githubData = { configured: true, is_active: true, move_to_done_on_merge: true, webhook_url: 'https://x/integrations/github/webhook/abc', secret_set: true };
    slackSave.mockClear();
    slackTest.mockClear();
    ghSave.mockClear();
});

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
    it('omits webhook_url when the URL field is left blank', async () => {
        render(<SlackConfigDrawer open onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(slackSave).toHaveBeenCalled());
        expect(slackSave).toHaveBeenCalledWith(expect.not.objectContaining({ webhook_url: expect.anything() }));
    });
    it('pre-populates events from data via useEffect hydration', () => {
        slackData = { configured: true, is_active: true, events: ['created'], url_preview: '…tok' };
        render(<SlackConfigDrawer open onClose={() => {}} />);
        expect(screen.getByLabelText('Issue created')).toBeChecked();
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
    it('omits webhook_secret when the secret field is left blank', async () => {
        render(<GithubConfigDrawer open onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save GitHub' }));
        await waitFor(() => expect(ghSave).toHaveBeenCalled());
        expect(ghSave).toHaveBeenCalledWith(expect.not.objectContaining({ webhook_secret: expect.anything() }));
    });
    it('sends move_to_done_on_merge: false after toggling the checkbox off', async () => {
        render(<GithubConfigDrawer open onClose={() => {}} />);
        fireEvent.click(screen.getByLabelText('Move linked issue to Done on PR merge'));
        fireEvent.click(screen.getByRole('button', { name: 'Save GitHub' }));
        await waitFor(() => expect(ghSave).toHaveBeenCalledWith(expect.objectContaining({ move_to_done_on_merge: false })));
    });
});

describe('config drawers (v2 look)', () => {
    it('v2: Slack fields are pill inputs, checkboxes are ink, actions are pill buttons', () => {
        render(<SlackConfigDrawer open onClose={() => {}} />);
        expect(screen.getByRole('heading', { name: 'Configure Slack' }).style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByLabelText('Slack webhook URL').className).toContain('border-field');
        expect((screen.getByLabelText('Assigned') as HTMLInputElement).style.accentColor).toBe('var(--fg)');
        expect(screen.getByRole('button', { name: 'Save' }).className).toContain('bg-fg');
        expect(screen.getByRole('button', { name: 'Send test' }).style.borderRadius).toBe('var(--radius-pill)');
    });

    it('v2: GitHub fields are pill inputs and Save GitHub is the ink button', () => {
        render(<GithubConfigDrawer open onClose={() => {}} />);
        expect(screen.getByLabelText('GitHub webhook secret').className).toContain('border-field');
        expect(screen.getByLabelText('GitHub webhook URL').className).toContain('border-field');
        expect((screen.getByLabelText('GitHub active') as HTMLInputElement).style.accentColor).toBe('var(--fg)');
        expect(screen.getByRole('button', { name: 'Save GitHub' }).className).toContain('bg-fg');
    });
});

describe('config drawers (G3a ink)', () => {
    it('G3a: Slack status messages use the ink partners (4.5:1)', async () => {
        render(<SlackConfigDrawer open onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect((await screen.findByText('Saved')).style.color).toBe('var(--green-ink)');
        slackTest.mockRejectedValueOnce(new Error('boom'));
        fireEvent.click(screen.getByRole('button', { name: 'Send test' }));
        expect((await screen.findByText('Failed to send test.')).style.color).toBe('var(--red-ink)');
    });
    it('G3a: GitHub status messages use the ink partners (4.5:1)', async () => {
        render(<GithubConfigDrawer open onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save GitHub' }));
        expect((await screen.findByText('Saved')).style.color).toBe('var(--green-ink)');
        ghSave.mockRejectedValueOnce(new Error('boom'));
        fireEvent.click(screen.getByRole('button', { name: 'Save GitHub' }));
        expect((await screen.findByText('Failed to save.')).style.color).toBe('var(--red-ink)');
    });
});
