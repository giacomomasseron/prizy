import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Kbd } from './Kbd';
import { Input } from './Input';
import { Switch } from './Switch';
import { SegmentedControl } from './SegmentedControl';
import { ThemeToggle } from './ThemeToggle';

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
  it('secondary variant has solid border', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' }) as HTMLElement;
    expect(btn.style.border).toBe('1px solid var(--border)');
  });
  it('ghost variant renders', () => {
    render(<Button variant="ghost">Edit</Button>);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
  it('ghost variant has transparent border and hover class', () => {
    render(<Button variant="ghost">Edit</Button>);
    const btn = screen.getByRole('button', { name: 'Edit' }) as HTMLElement;
    expect(btn.style.border).toBe('1px solid transparent');
    expect(btn.className).toContain('hover:bg-hover');
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
  it('track background is accent when checked', () => {
    const { container } = render(<Switch checked={true} onChange={() => {}} label="Enabled" />);
    const track = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(track).toHaveStyle({ background: 'var(--accent)' });
  });
  it('track background is border2 when unchecked', () => {
    const { container } = render(<Switch checked={false} onChange={() => {}} label="Disabled" />);
    const track = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(track).toHaveStyle({ background: 'var(--border2)' });
  });
  it('ariaLabel overrides the accessible name of the checkbox', () => {
    render(<Switch checked={false} onChange={() => {}} label="2-day cooldown after cycle ends" ariaLabel="Cooldown" />);
    // The hidden checkbox should use the short ariaLabel, not the visible label text
    expect(screen.getByRole('checkbox', { name: 'Cooldown' })).toBeInTheDocument();
    // The visible label text should still be rendered in the DOM
    expect(screen.getByText('2-day cooldown after cycle ends')).toBeInTheDocument();
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
  it('active option has panel background', () => {
    render(<SegmentedControl options={[...opts]} value="list" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'List' })).toHaveStyle({ background: 'var(--panel)' });
  });
  it('inactive option has transparent background', () => {
    render(<SegmentedControl options={[...opts]} value="list" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Board' })).toHaveStyle({ background: 'transparent' });
  });
});

describe('ThemeToggle', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders a button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('clicking the button toggles document.documentElement.dataset.theme', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    // Defaults to dark (localStorage empty), so one click → light
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
