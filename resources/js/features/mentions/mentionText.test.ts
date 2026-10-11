import { describe, expect, it } from 'vitest';
import { applyPick, detectMention, matchMembers, mentionHandle, textParts } from './mentionText';

// P7-B: the @ mention picker's text rules (the Project v2 design).
describe('detectMention', () => {
    it('opens on an @ at the start of the text or after a space, with the query up to the caret', () => {
        expect(detectMention('@ma', 3)).toEqual({ start: 0, end: 3, q: 'ma' });
        expect(detectMention('ask @pri', 8)).toEqual({ start: 4, end: 8, q: 'pri' });
        expect(detectMention('ask @', 5)).toEqual({ start: 4, end: 5, q: '' });
    });

    it('stays closed inside a word, after a space in the query, or before the @', () => {
        expect(detectMention('mail a@b', 8)).toBeNull();
        expect(detectMention('@maya chen', 10)).toBeNull();
        expect(detectMention('hi @maya', 2)).toBeNull();
    });

    it('reads only the text before the caret', () => {
        expect(detectMention('@ma rest', 3)).toEqual({ start: 0, end: 3, q: 'ma' });
    });
});

describe('applyPick', () => {
    it('replaces @query with the insert and one space, and puts the caret after it', () => {
        expect(applyPick('ask @ma', { start: 4, end: 7, q: 'ma' }, '@Maya Chen')).toEqual({ text: 'ask @Maya Chen ', caret: 15 });
    });

    it('keeps the text after the caret, dropping one space that already followed', () => {
        expect(applyPick('see @ab about it', { start: 4, end: 7, q: 'ab' }, 'PRZ-ABC123')).toEqual({ text: 'see PRZ-ABC123 about it', caret: 15 });
    });
});

describe('matchMembers', () => {
    const members = [
        { id: 'u3', name: 'Priya Patel' },
        { id: 'u1', name: 'Maya Chen' },
        { id: 'me', name: 'Alex Rivera' },
        { id: 'u4', name: 'Leon King' },
    ];

    it('leaves out yourself and lists the rest alphabetically for an empty query', () => {
        expect(matchMembers(members, '', 'me').map((m) => m.name)).toEqual(['Leon King', 'Maya Chen', 'Priya Patel']);
    });

    it('matches a name that contains the query, or initials that start with it, in any case', () => {
        expect(matchMembers(members, 'CHEN', 'me').map((m) => m.name)).toEqual(['Maya Chen']);
        expect(matchMembers(members, 'pp', 'me').map((m) => m.name)).toEqual(['Priya Patel']);
    });

    it('offers at most the limit', () => {
        const many = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, name: `Member ${i}` }));
        expect(matchMembers(many, '', undefined)).toHaveLength(5);
    });
});

describe('mentionHandle', () => {
    it('is @ and the lower-case first name', () => {
        expect(mentionHandle('Maya Chen')).toBe('@maya');
    });
});

describe('applyPick before a line break', () => {
    it('keeps the line break that follows the mention', () => {
        expect(applyPick('@ab\nnext', { start: 0, end: 3, q: 'ab' }, 'PRZ-ABC123')).toEqual({ text: 'PRZ-ABC123 \nnext', caret: 11 });
    });
});

describe('textParts', () => {
    it('picks out the linked issues\' references and @Full Name mentions, longest name first', () => {
        expect(textParts('Ask @Maya Chen about PRZ-ABC123 and PRZ-DEF456', ['PRZ-ABC123', 'PRZ-DEF456'], ['Maya', 'Maya Chen'])).toEqual([
            { kind: 'text', text: 'Ask ' },
            { kind: 'name', text: '@Maya Chen' },
            { kind: 'text', text: ' about ' },
            { kind: 'ref', text: 'PRZ-ABC123' },
            { kind: 'text', text: ' and ' },
            { kind: 'ref', text: 'PRZ-DEF456' },
        ]);
    });

    it('leaves any other PRZ- text plain: only the picked issues link', () => {
        expect(textParts('See PRZ-FFF000', ['PRZ-ABC123'], [])).toEqual([{ kind: 'text', text: 'See PRZ-FFF000' }]);
        expect(textParts('See PRZ-FFF000', [], [])).toEqual([{ kind: 'text', text: 'See PRZ-FFF000' }]);
    });
});
