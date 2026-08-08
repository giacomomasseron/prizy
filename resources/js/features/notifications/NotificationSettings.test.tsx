import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from './NotificationSettings';

const setPreference = vi.fn();
const updateDigest = vi.fn();
const onBack = vi.fn();

let prefsData: Record<string, unknown> | undefined = {
    email_digest_frequency: 'daily',
    preferences: [
        { event_type: 'mention', in_app: true, email: true },
        { event_type: 'assign', in_app: true, email: false },
        { event_type: 'comment', in_app: false, email: false },
        { event_type: 'status', in_app: true, email: true },
        { event_type: 'unblocked', in_app: true, email: false },
    ],
};
let prefsLoading = false;

vi.mock('./hooks', () => ({
    usePreferences: () => ({ data: prefsData, isLoading: prefsLoading }),
    useSetPreference: () => ({ mutate: setPreference }),
}));

vi.mock('../settings/hooks', () => ({
    useUpdateNotificationPreferences: () => ({ mutate: updateDigest }),
}));

function wrap() {
    return render(<NotificationSettings onBack={onBack} />);
}

describe('NotificationSettings', () => {
    afterEach(() => {
        vi.clearAllMocks();
        prefsLoading = false;
        prefsData = {
            email_digest_frequency: 'daily',
            preferences: [
                { event_type: 'mention', in_app: true, email: true },
                { event_type: 'assign', in_app: true, email: false },
                { event_type: 'comment', in_app: false, email: false },
                { event_type: 'status', in_app: true, email: true },
                { event_type: 'unblocked', in_app: true, email: false },
            ],
        };
    });

    it('renders the header row and a row per event with two toggles each', () => {
        wrap();
        expect(screen.getByText('Delivery per event')).toBeInTheDocument();
        expect(screen.getByText('In-app')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();

        expect(screen.getByText('Mentions')).toBeInTheDocument();
        expect(screen.getByText('Assignments')).toBeInTheDocument();
        expect(screen.getByText('Comments on followed issues')).toBeInTheDocument();
        expect(screen.getByText('Status changes')).toBeInTheDocument();
        expect(screen.getByText('Unblocked')).toBeInTheDocument();

        expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    });

    it('toggling In-app for "comment" calls useSetPreference with event_type/channel/enabled', () => {
        wrap();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Comments on followed issues in-app' }));
        expect(setPreference).toHaveBeenCalledWith({ event_type: 'comment', channel: 'in_app', enabled: true });
    });

    it('toggling In-app off for a currently-on row calls useSetPreference with enabled:false', () => {
        wrap();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Mentions in-app' }));
        expect(setPreference).toHaveBeenCalledWith({ event_type: 'mention', channel: 'in_app', enabled: false });
    });

    it('toggling Email for a row calls useSetPreference with channel:email', () => {
        wrap();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Assignments email' }));
        expect(setPreference).toHaveBeenCalledWith({ event_type: 'assign', channel: 'email', enabled: true });
    });

    it('a row with in_app:false renders the Email toggle disabled', () => {
        wrap();
        expect(screen.getByRole('checkbox', { name: 'Comments on followed issues email' })).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Comments on followed issues in-app' })).not.toBeDisabled();
    });

    it('a row with in_app:true renders the Email toggle enabled', () => {
        wrap();
        expect(screen.getByRole('checkbox', { name: 'Mentions email' })).not.toBeDisabled();
    });

    it('clicking a disabled Email toggle does not fire useSetPreference', async () => {
        // fireEvent.click bypasses the native `disabled` guard in jsdom; userEvent
        // models real browser behavior (a disabled control swallows the click).
        const user = userEvent.setup();
        wrap();
        await user.click(screen.getByRole('checkbox', { name: 'Comments on followed issues email' }));
        expect(setPreference).not.toHaveBeenCalled();
    });

    it('the Digest control fires the digest setter with the chosen value', () => {
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
        expect(updateDigest).toHaveBeenCalledWith('weekly');
    });

    it('"Back to inbox" calls onBack', () => {
        wrap();
        fireEvent.click(screen.getByRole('button', { name: /Back to inbox/ }));
        expect(onBack).toHaveBeenCalled();
    });

    it('renders a loading state while preferences are loading', () => {
        prefsLoading = true;
        wrap();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
        expect(screen.queryByText('Mentions')).not.toBeInTheDocument();
    });
});
