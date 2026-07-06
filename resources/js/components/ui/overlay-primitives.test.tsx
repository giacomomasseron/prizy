import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';
import { Menu } from './Menu';
import { Modal } from './Modal';
import { useRef } from 'react';

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
