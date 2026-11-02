import { describe, it, expect } from 'vitest';
import { avatarFor } from './avatarFor';

// Must mirror the private AVATAR_COLORS palette in avatarFor.ts
const PALETTE = ['#6d69f2', '#4bab66', '#f08c00', '#e64980', '#1c7ed6', '#9c36b5', '#f03e3e'];

describe('avatarFor', () => {
    it('returns empty initials and undefined color for null user', () => {
        expect(avatarFor(null)).toEqual({ initials: '', color: undefined });
    });

    it('returns empty initials and undefined color for undefined user', () => {
        expect(avatarFor(undefined)).toEqual({ initials: '', color: undefined });
    });

    it('single-word name: uses first two chars of the word, uppercased', () => {
        // 'alice' → parts[0].slice(0,2).toUpperCase() = 'AL'
        expect(avatarFor({ id: 'u1', name: 'alice' }).initials).toBe('AL');
    });

    it('two-word name: uses first char of first and last word, uppercased', () => {
        // 'John Doe' → ('J' + 'D').toUpperCase() = 'JD'
        expect(avatarFor({ id: 'u1', name: 'John Doe' }).initials).toBe('JD');
    });

    it('three-word name: uses first char of first and last word only (max 2 letters)', () => {
        // 'John Middle Doe' → ('J' + 'D').toUpperCase() = 'JD'
        expect(avatarFor({ id: 'u1', name: 'John Middle Doe' }).initials).toBe('JD');
    });

    it('lowercase input produces uppercase initials', () => {
        // 'john doe' → ('j' + 'd').toUpperCase() = 'JD'
        expect(avatarFor({ id: 'u1', name: 'john doe' }).initials).toBe('JD');
    });

    it('color is always one of the palette values', () => {
        const { color } = avatarFor({ id: 'user-42', name: 'Jane Doe' });
        expect(PALETTE).toContain(color);
    });

    it('color is stable: same id always returns the same color', () => {
        const user = { id: 'test-id-stable', name: 'Any Name' };
        expect(avatarFor(user).color).toBe(avatarFor(user).color);
    });

    it('color is deterministic across multiple independent calls with the same id', () => {
        const user = { id: 'replay-me', name: 'Foo Bar' };
        const first = avatarFor(user);
        const second = avatarFor(user);
        const third = avatarFor(user);
        expect(second.color).toBe(first.color);
        expect(third.color).toBe(first.color);
    });
});
