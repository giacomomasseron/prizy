import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Kbd } from './Kbd';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Switch } from './Switch';
import { SegmentedControl } from './SegmentedControl';
import { ThemeToggle } from './ThemeToggle';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
  it('primary is an ink pill that turns accent on hover (class-driven, no inline background)', () => {
    render(<Button variant="primary">Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' }) as HTMLElement;
    expect(btn.style.background).toBe('');
    expect(btn.className).toContain('bg-fg');
    expect(btn.className).toContain('text-bg');
    expect(btn.className).toContain('enabled:hover:bg-accent');
    expect(btn.style.borderRadius).toBe('var(--radius-pill)');
  });
  it('secondary variant renders', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
  it('secondary has a border2 outline that darkens on hover', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' }) as HTMLElement;
    expect(btn.style.borderColor).toBe('');
    expect(btn.className).toContain('border-border2');
    expect(btn.className).toContain('enabled:hover:border-fg');
  });
  it('ghost variant renders', () => {
    render(<Button variant="ghost">Edit</Button>);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
  it('ghost has no border colour and a hover fill', () => {
    render(<Button variant="ghost">Edit</Button>);
    const btn = screen.getByRole('button', { name: 'Edit' }) as HTMLElement;
    expect(btn.className).toContain('border-transparent');
    expect(btn.className).toContain('enabled:hover:bg-hover');
  });
  it('a caller style still wins (e.g. danger red)', () => {
    render(<Button variant="primary" style={{ background: 'var(--red)' }}>Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveStyle({ background: 'var(--red)' });
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
  it('IconButton is round, has no inline background, and its hover class can fire', () => {
    render(<IconButton title="Close">✕</IconButton>);
    const btn = screen.getByRole('button', { name: 'Close' }) as HTMLElement;
    expect(btn.style.borderRadius).toBe('50%');
    expect(btn.style.background).toBe('');
    expect(btn.className).toContain('hover:bg-hover');
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

describe('Input/Textarea v2', () => {
  it('Input is a pill with a 1.5px field outline (3:1) and a visible focus border', () => {
    render(<Input aria-label="Name" />);
    const el = screen.getByRole('textbox', { name: 'Name' }) as HTMLElement;
    expect(el.style.borderRadius).toBe('var(--radius-pill)');
    expect(el.style.border).toBe('');
    expect(el.className).toContain('border-field');
    expect(el.className).toContain('focus:border-fg');
  });
  it('Textarea uses the card radius and the same focus border', () => {
    render(<Textarea aria-label="Body" />);
    const el = screen.getByRole('textbox', { name: 'Body' }) as HTMLElement;
    expect(el.style.borderRadius).toBe('var(--radius-card)');
    expect(el.className).toContain('focus:border-fg');
  });
  it('a caller className is kept alongside the field classes', () => {
    render(<Input aria-label="X" className="w-40" />);
    const el = screen.getByRole('textbox', { name: 'X' }) as HTMLElement;
    expect(el.className).toContain('w-40');
    expect(el.className).toContain('focus:border-fg');
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
  it('shows a focus ring on the track when the hidden checkbox has keyboard focus', () => {
    const { container } = render(<Switch checked={false} onChange={() => {}} label="Focusable" />);
    expect(screen.getByRole('checkbox', { name: 'Focusable' }).className).toContain('peer');
    const track = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(track.className).toContain('peer-focus-visible:outline-fg');
    expect(track.className).toContain('peer-focus-visible:outline-offset-2');
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
  it('track and options are pills; active option has a 3:1 field ring', () => {
    render(<SegmentedControl options={[...opts]} value="list" onChange={() => {}} />);
    const active = screen.getByRole('button', { name: 'List' }) as HTMLElement;
    expect(active.style.borderRadius).toBe('var(--radius-pill)');
    expect(active.style.boxShadow).toBe('0 0 0 1.5px var(--field)');
    expect((active.parentElement as HTMLElement).style.borderRadius).toBe('var(--radius-pill)');
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
    // Defaults to light (localStorage empty), so one click → dark
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('G3a: toggles announce and ring the selected segment', () => {
  it('SegmentedControl buttons carry aria-pressed, true only on the selected one', () => {
    render(<SegmentedControl options={[{ label: 'List', value: 'list' }, { label: 'Board', value: 'board' }]} value="board" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false');
  });
});
