import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeekTextField } from './PeekTextField';

function field(value: string, onSave = vi.fn()) {
    return <PeekTextField value={value} onSave={onSave} singleLine label="Issue title" placeholder="Issue title" className="" style={{}} />;
}

describe('PeekTextField', () => {
    it('takes a newer saved text while you are in the field but have not changed it, and leaving then saves nothing', async () => {
        const onSave = vi.fn();
        const { rerender } = render(field('Old', onSave));
        const box = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.click(box);
        rerender(field('Renamed by a colleague', onSave));
        expect(box).toHaveValue('Renamed by a colleague');
        await userEvent.tab();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('keeps your unsaved text when a newer saved text arrives, and saves yours when you leave', async () => {
        const onSave = vi.fn();
        const { rerender } = render(field('Old', onSave));
        const box = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.type(box, ' mine');
        rerender(field('Renamed by a colleague', onSave));
        expect(box).toHaveValue('Old mine');
        await userEvent.tab();
        expect(onSave.mock.calls[0][0]).toBe('Old mine');
    });

    it('takes a newer saved text when you are not in the field', () => {
        const { rerender } = render(field('Old'));
        rerender(field('New'));
        expect(screen.getByRole('textbox', { name: 'Issue title' })).toHaveValue('New');
    });

    it('Enter while an input method is composing a word does not save', async () => {
        const onSave = vi.fn();
        render(field('Old', onSave));
        const box = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.type(box, '!');
        fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
        expect(onSave).not.toHaveBeenCalled();
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(onSave).toHaveBeenCalledWith('Old!', expect.any(Function));
    });

    it('turns pasted line breaks in a title into spaces', async () => {
        const onSave = vi.fn();
        render(field('Old', onSave));
        const box = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.clear(box);
        fireEvent.change(box, { target: { value: 'Line one\n  Line two ' } });
        await userEvent.tab();
        expect(onSave.mock.calls[0][0]).toBe('Line one Line two');
        expect(box).toHaveValue('Line one Line two');
    });
});
