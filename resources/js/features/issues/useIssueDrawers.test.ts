import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { useIssueDrawers } from './useIssueDrawers';

function Harness({ onState }: { onState: (s: ReturnType<typeof useIssueDrawers>) => void }) {
    const state = useIssueDrawers();
    onState(state);
    return null;
}

function mountInRouter(initialPath = '/') {
    let captured: ReturnType<typeof useIssueDrawers>;
    const { rerender } = render(
        React.createElement(MemoryRouter, { initialEntries: [initialPath] },
            React.createElement(Harness, { onState: (s) => { captured = s; } })
        )
    );
    return { get: () => captured!, rerender };
}

describe('useIssueDrawers', () => {
    it('initial state: no peek, no create', () => {
        const { get } = mountInRouter('/');
        expect(get().peekId).toBeNull();
        expect(get().createOpen).toBe(false);
        expect(get().createStatus).toBeNull();
    });

    it('openPeek sets peekId', () => {
        const { get } = mountInRouter('/');
        act(() => get().openPeek('issue-abc'));
        expect(get().peekId).toBe('issue-abc');
        expect(get().createOpen).toBe(false);
    });

    it('openCreate sets createOpen and optional status', () => {
        const { get } = mountInRouter('/');
        act(() => get().openCreate({ status: 'in_progress' }));
        expect(get().createOpen).toBe(true);
        expect(get().createStatus).toBe('in_progress');
        expect(get().peekId).toBeNull();
    });

    it('close clears all params', () => {
        const { get } = mountInRouter('/?peek=x');
        act(() => get().close());
        expect(get().peekId).toBeNull();
        expect(get().createOpen).toBe(false);
    });

    it('openPeek from ?create=1 clears createOpen', () => {
        const { get } = mountInRouter('/?create=1');
        act(() => get().openPeek('y'));
        expect(get().createOpen).toBe(false);
        expect(get().peekId).toBe('y');
    });
});
