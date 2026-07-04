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

// Filter-preservation tests — use an augmented harness that also captures raw searchParams
import { useSearchParams } from 'react-router-dom';

function FullHarness({ onCapture }: {
    onCapture: (state: ReturnType<typeof useIssueDrawers>, sp: URLSearchParams) => void;
}) {
    const state = useIssueDrawers();
    const [sp] = useSearchParams();
    onCapture(state, sp);
    return null;
}

function mountFull(initialPath: string) {
    let drawerState: ReturnType<typeof useIssueDrawers>;
    let searchParams: URLSearchParams;

    render(
        React.createElement(MemoryRouter, { initialEntries: [initialPath] },
            React.createElement(FullHarness, {
                onCapture: (s, sp) => { drawerState = s; searchParams = sp; },
            })
        )
    );

    return {
        getState: () => drawerState!,
        getSP: () => searchParams!,
    };
}

describe('useIssueDrawers – filter preservation', () => {
    it('openPeek keeps unrelated params and sets peek', () => {
        const { getState, getSP } = mountFull('/?team=abc');
        act(() => getState().openPeek('i1'));
        expect(getSP().get('peek')).toBe('i1');
        expect(getSP().get('team')).toBe('abc');
        expect(getSP().get('create')).toBeNull();
    });

    it('openCreate keeps unrelated params, sets create+status, clears peek', () => {
        const { getState, getSP } = mountFull('/?team=abc&peek=old');
        act(() => getState().openCreate({ status: 'todo' }));
        expect(getSP().get('team')).toBe('abc');
        expect(getSP().get('create')).toBe('1');
        expect(getSP().get('cstatus')).toBe('todo');
        expect(getSP().get('status')).toBeNull();
        expect(getSP().get('peek')).toBeNull();
    });

    it('openCreate without status preserves status filter param', () => {
        const { getState, getSP } = mountFull('/?team=abc&status=done');
        act(() => getState().openCreate());
        expect(getSP().get('team')).toBe('abc');
        expect(getSP().get('create')).toBe('1');
        expect(getSP().get('status')).toBe('done');
        expect(getSP().get('cstatus')).toBeNull();
    });

    it('openPeek preserves status filter param', () => {
        const { getState, getSP } = mountFull('/?status=backlog');
        act(() => getState().openPeek('i1'));
        expect(getSP().get('peek')).toBe('i1');
        expect(getSP().get('status')).toBe('backlog');
        expect(getSP().get('create')).toBeNull();
        expect(getSP().get('cstatus')).toBeNull();
    });

    it('openCreate preserves status filter param while setting cstatus', () => {
        const { getState, getSP } = mountFull('/?status=backlog');
        act(() => getState().openCreate({ status: 'todo' }));
        expect(getSP().get('status')).toBe('backlog');
        expect(getSP().get('cstatus')).toBe('todo');
        expect(getSP().get('create')).toBe('1');
        expect(getSP().get('peek')).toBeNull();
    });
});
