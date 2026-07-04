import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Kbd } from './Kbd';
import { Input } from './Input';
import { Switch } from './Switch';
import { SegmentedControl } from './SegmentedControl';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
  it('primary variant applies accent background style', () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({ background: 'var(--accent)' });
  });
  it('secondary variant renders', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
  it('ghost variant renders', () => {
    render(<Button variant="ghost">Edit</Button>);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
  it('forwards disabled prop', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('IconButton', () => {
  it('renders with title as accessible name', () => {
    render(<IconButton title="Close">✕</IconButton>);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('Kbd', () => {
  it('renders keycap text', () => {
    render(<Kbd>⌘K</Kbd>);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders input element', () => {
    render(<Input aria-label="Title" placeholder="Enter title…" />);
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
  });
});

describe('Switch', () => {
  it('renders with checked state', () => {
    render(<Switch checked={true} onChange={() => {}} label="Enabled" />);
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked();
  });
  it('calls onChange when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Toggle" />);
    await user.click(screen.getByRole('checkbox', { name: 'Toggle' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('SegmentedControl', () => {
  const opts = [{ label: 'List', value: 'list' }, { label: 'Board', value: 'board' }] as const;

  it('renders all options', () => {
    render(<SegmentedControl options={[...opts]} value="list" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument();
  });
  it('calls onChange with clicked value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl options={[...opts]} value="list" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Board' }));
    expect(onChange).toHaveBeenCalledWith('board');
  });
});
