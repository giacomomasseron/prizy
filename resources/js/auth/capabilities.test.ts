import { describe, expect, it } from 'vitest';
import { canDevelop, canUseTracker, canWorkHelpdesk, homePathFor } from './capabilities';
import type { Me } from '../lib/types';

const me = (over: Partial<Me>): Me => ({
    id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@e.com',
    admin_level: 'member', is_developer: false, is_agent: false,
    email_digest_frequency: 'off', workspace: { helpdesk_enabled: true }, ...over,
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

describe('canWorkHelpdesk', () => {
    it('is true for an agent in a workspace that runs a help desk', () => expect(canWorkHelpdesk(me({ is_agent: true }))).toBe(true));
    it('is false for an agent once the workspace switches the helpdesk off', () => expect(canWorkHelpdesk(me({ is_agent: true, workspace: { helpdesk_enabled: false } }))).toBe(false));
    it('is false for a non-agent however the switch is set', () => expect(canWorkHelpdesk(me({ is_agent: false }))).toBe(false));
    it('is false for an owner who is not an agent (no owner bypass, matching the backend)', () => expect(canWorkHelpdesk(me({ admin_level: 'owner' }))).toBe(false));
    it('is false when me is undefined', () => expect(canWorkHelpdesk(undefined)).toBe(false));
});

describe('homePathFor', () => {
    it('sends a developer to the tracker', () => expect(homePathFor(me({ is_developer: true }))).toBe('/'));
    it('sends an owner to the tracker', () => expect(homePathFor(me({ admin_level: 'owner' }))).toBe('/'));
    it('sends an agent-only user to the support desk', () => expect(homePathFor(me({ is_agent: true }))).toBe('/support'));
    it('sends a no-capability member to settings', () => expect(homePathFor(me({}))).toBe('/settings'));
    it('sends an agent to settings when the helpdesk is off, not to a desk that 404s', () => expect(homePathFor(me({ is_agent: true, workspace: { helpdesk_enabled: false } }))).toBe('/settings'));
    it('prefers the tracker for a dev+agent user', () => expect(homePathFor(me({ is_developer: true, is_agent: true }))).toBe('/'));
});
