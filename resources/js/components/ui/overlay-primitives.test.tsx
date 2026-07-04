import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';
import { Menu } from './Menu';
import { Modal } from './Modal';

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
});
