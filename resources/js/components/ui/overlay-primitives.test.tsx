import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { Menu } from './Menu';
import { Modal } from './Modal';
import { isTopmost, popOverlay, pushOverlay } from './overlayStack';

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}><p>content</p></Modal>);
    expect(container.querySelector('p')).toBeNull();
  });
  it('renders children when open=true', () => {
    render(<Modal open={true} onClose={() => {}}><p>Hello modal</p></Modal>);
    expect(screen.getByText('Hello modal')).toBeInTheDocument();
  });
  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose}><p>content</p></Modal>);
    // Click the backdrop (the dialog element itself)
    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('does not call onClose when clicking inside the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose}><p>panel content</p></Modal>);
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose}><p>content</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Drawer', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<Drawer open={false} onClose={() => {}}><p>drawer</p></Drawer>);
    expect(container.querySelector('p')).toBeNull();
  });
  it('renders children when open=true', () => {
    render(<Drawer open={true} onClose={() => {}}><p>Drawer content</p></Drawer>);
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<Drawer open={true} onClose={onClose}><p>content</p></Drawer>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Drawer open={true} onClose={onClose}><p>drawer</p></Drawer>);
    // Backdrop is the flex:1 sibling rendered before the panel inside the outer fixed container
    const outerDiv = container.firstElementChild as HTMLElement;
    const backdrop = outerDiv.children[0] as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Menu', () => {
  const items = [
    { key: 'settings', label: 'Settings', onActivate: vi.fn() },
    { key: 'logout', label: 'Logout', onActivate: vi.fn(), danger: true },
  ];

  it('shows menu items after trigger click', async () => {
    const user = userEvent.setup();
    render(<Menu trigger={<button>Open</button>} items={items} />);
    expect(screen.queryByText('Settings')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
  });

  it('calls onActivate and closes when item is clicked', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <Menu trigger={<button>Open</button>} items={[{ key: 'a', label: 'Action', onActivate }]} />,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action' }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('renders subtitle below label when subtitle is provided', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        trigger={<button>Open</button>}
        items={[{ key: 'sub', label: 'Settings', subtitle: 'Configure things', onActivate: vi.fn() }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure things')).toBeInTheDocument();
  });
});

describe('Drawer focus-trap + a11y', () => {
    it('sets role=dialog + aria-modal + aria-label and moves focus inside on open', () => {
        render(<Drawer open onClose={() => {}} label="Test drawer"><button>Inside</button></Drawer>);
        const dialog = screen.getByRole('dialog', { name: 'Test drawer' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog.contains(document.activeElement)).toBe(true); // focus moved inside
    });
    it('wraps Tab within the panel and restores focus on close', () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();
        const { rerender } = render(
            <Drawer open onClose={() => {}} label="D"><button>A</button><button>B</button></Drawer>,
        );
        const [a, b] = screen.getAllByRole('button').filter((n) => ['A', 'B'].includes(n.textContent ?? ''));
        b.focus();
        fireEvent.keyDown(b, { key: 'Tab' });          // from last → wraps to first
        expect(document.activeElement).toBe(a);
        fireEvent.keyDown(a, { key: 'Tab', shiftKey: true }); // shift+Tab from first → wraps to last
        expect(document.activeElement).toBe(b);
        rerender(<Drawer open={false} onClose={() => {}} label="D"><button>A</button></Drawer>);
        expect(document.activeElement).toBe(trigger);  // focus restored
        trigger.remove();
    });
});

describe('Modal focus-trap', () => {
    it('moves focus inside on open and restores on close', () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();
        const { rerender } = render(<Modal open onClose={() => {}} label="M"><button>OK</button></Modal>);
        const dialog = screen.getByRole('dialog', { name: 'M' });
        expect(dialog.contains(document.activeElement)).toBe(true);
        rerender(<Modal open={false} onClose={() => {}} label="M"><button>OK</button></Modal>);
        expect(document.activeElement).toBe(trigger);
        trigger.remove();
    });
});

describe('Menu keyboard + aria', () => {
    function open3(onA = vi.fn()) {
        render(<Menu trigger={<button>Open</button>} items={[
            { key: 'a', label: 'Alpha', onActivate: onA },
            { key: 'b', label: 'Beta', onActivate: vi.fn() },
            { key: 'c', label: 'Gamma', onActivate: vi.fn() },
        ]} />);
        return onA;
    }
    it('trigger exposes aria-haspopup=menu + aria-expanded', () => {
        open3();
        const trigger = screen.getByRole('button', { name: 'Open' });
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
    it('focuses the first item on open and moves with ArrowDown', () => {
        open3();
        fireEvent.click(screen.getByRole('button', { name: 'Open' }));
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Alpha' }));
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Beta' }));
    });
    it('activates the focused item on Enter and closes', () => {
        const onA = open3();
        fireEvent.click(screen.getByRole('button', { name: 'Open' }));
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' }); // Alpha focused
        expect(onA).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).toBeNull();
    });
    it('closes on Escape and restores focus to the trigger', () => {
        open3();
        const trigger = screen.getByRole('button', { name: 'Open' });
        fireEvent.click(trigger);
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });
});

describe('Drawer / Modal autoFocus respect', () => {
    it('keeps focus on the autoFocus element even when it is not the first focusable', () => {
        // Render a Drawer where the second element has autoFocus.
        // The focus-trap must NOT steal focus back to the first button.
        render(
            <Drawer open onClose={() => {}} label="AutoFocus drawer">
                <button>First</button>
                <input autoFocus aria-label="Focus me" />
            </Drawer>,
        );
        // The autoFocus input must be the active element, not the first button.
        expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Focus me' }));
        expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'First' }));
    });

    it('still moves focus to the first focusable when no autoFocus is present', () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();
        render(
            <Drawer open onClose={() => {}} label="No autoFocus drawer">
                <button>Alpha</button>
                <button>Beta</button>
            </Drawer>,
        );
        // Without autoFocus, the trap must move focus to the first focusable.
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Alpha' }));
        trigger.remove();
    });
});

describe('Button', () => {
    it('applies the shared hover class', () => {
        render(<Button variant="ghost">x</Button>);
        expect(screen.getByRole('button', { name: 'x' }).className).toContain('hover:bg-hover');
    });
});

describe('overlayStack', () => {
    it('tracks the top-most overlay', () => {
        pushOverlay('a'); expect(isTopmost('a')).toBe(true);
        pushOverlay('b'); expect(isTopmost('a')).toBe(false); expect(isTopmost('b')).toBe(true);
        popOverlay('b'); expect(isTopmost('a')).toBe(true);
        popOverlay('a');
    });
});

describe('nested overlay Escape (Drawer under Modal)', () => {
    it('Escape closes only the top-most overlay', () => {
        const drawerClose = vi.fn();
        const modalClose = vi.fn();
        const { rerender } = render(
            <>
                <Drawer open onClose={drawerClose} label="D"><button>d</button></Drawer>
                <Modal open onClose={modalClose} label="M"><button>m</button></Modal>
            </>,
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(modalClose).toHaveBeenCalledTimes(1);
        expect(drawerClose).not.toHaveBeenCalled();     // drawer stays (not top-most)
        // close the modal; a second Escape now closes the drawer
        rerender(<><Drawer open onClose={drawerClose} label="D"><button>d</button></Drawer><Modal open={false} onClose={modalClose} label="M"><button>m</button></Modal></>);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(drawerClose).toHaveBeenCalledTimes(1);
    });
});
