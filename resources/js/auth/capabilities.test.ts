import { describe, expect, it } from 'vitest';
import { canDevelop, canUseTracker, homePathFor } from './capabilities';
import type { Me } from '../lib/types';

const me = (over: Partial<Me>): Me => ({
    id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@e.com',
    admin_level: 'member', is_developer: false, is_agent: false,
    email_digest_frequency: 'off', ...over,
});

describe('canUseTracker', () => {
    it('is true for a developer', () => expect(canUseTracker(me({ is_developer: true }))).toBe(true));
    it('is true for an owner without is_developer', () => expect(canUseTracker(me({ admin_level: 'owner' }))).toBe(true));
    it('is false for an agent-only member', () => expect(canUseTracker(me({ is_agent: true }))).toBe(false));
    it('is false when me is undefined', () => expect(canUseTracker(undefined)).toBe(false));
});

describe('canDevelop', () => {
    it('is true for a developer member', () => expect(canDevelop(me({ is_developer: true }))).toBe(true));
    it('is true for an owner without is_developer (owner bypass — must not lose create)', () => expect(canDevelop(me({ admin_level: 'owner' }))).toBe(true));
    it('is false for a viewer even with is_developer (read-only)', () => expect(canDevelop(me({ is_developer: true, admin_level: 'viewer' }))).toBe(false));
    it('is false for an agent-only member', () => expect(canDevelop(me({ is_agent: true }))).toBe(false));
    it('is false when me is undefined', () => expect(canDevelop(undefined)).toBe(false));
});

describe('homePathFor', () => {
    it('sends a developer to the tracker', () => expect(homePathFor(me({ is_developer: true }))).toBe('/'));
    it('sends an owner to the tracker', () => expect(homePathFor(me({ admin_level: 'owner' }))).toBe('/'));
    it('sends an agent-only user to the support desk', () => expect(homePathFor(me({ is_agent: true }))).toBe('/support'));
    it('sends a no-capability member to settings', () => expect(homePathFor(me({}))).toBe('/settings'));
    it('prefers the tracker for a dev+agent user', () => expect(homePathFor(me({ is_developer: true, is_agent: true }))).toBe('/'));
});
