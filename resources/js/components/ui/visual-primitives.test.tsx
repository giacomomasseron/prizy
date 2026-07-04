import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';
import { AvatarStack } from './AvatarStack';
import { LabelChip } from './LabelChip';
import { PriorityIcon } from './PriorityIcon';
import { ProjectPill } from './ProjectPill';
import { StatusIcon } from './StatusIcon';
import { TeamTile } from './TeamTile';

describe('Avatar', () => {
  it('renders initials and has accessible label', () => {
    render(<Avatar initials="AB" color="#e0724a" size={24} title="Alice Brown" />);
    const el = screen.getByLabelText('Alice Brown');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toBe('AB');
  });
  it('renders unassigned (dashed) variant when initials is empty', () => {
    render(<Avatar title="Unassigned" />);
    expect(screen.getByLabelText('Unassigned')).toBeInTheDocument();
  });
});

describe('AvatarStack', () => {
  it('renders up to max avatars', () => {
    const avatars = [
      { initials: 'AA', color: '#e0724a', title: 'Alice' },
      { initials: 'BB', color: '#4a7fe0', title: 'Bob' },
      { initials: 'CC', color: '#3a9a68', title: 'Carol' },
    ];
    render(<AvatarStack avatars={avatars} max={2} />);
    expect(screen.getByLabelText('Alice')).toBeInTheDocument();
    expect(screen.getByLabelText('Bob')).toBeInTheDocument();
    // overflow badge "+1"
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});

describe('StatusIcon', () => {
  it.each([
    'backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled',
  ] as const)('renders status=%s with aria-label', (status) => {
    render(<StatusIcon status={status} />);
    expect(screen.getByLabelText(status)).toBeInTheDocument();
  });

  it('backlog has dashed border', () => {
    render(<StatusIcon status="backlog" />);
    const el = screen.getByLabelText('backlog') as HTMLElement;
    expect(el.style.border).toBe('1.6px dashed var(--fg3)');
  });

  it('todo has solid border', () => {
    render(<StatusIcon status="todo" />);
    const el = screen.getByLabelText('todo') as HTMLElement;
    expect(el.style.border).toBe('1.6px solid var(--fg3)');
  });

  it('done textContent is checkmark', () => {
    render(<StatusIcon status="done" />);
    expect(screen.getByLabelText('done').textContent).toBe('✓');
  });

  it('cancelled textContent is cross', () => {
    render(<StatusIcon status="cancelled" />);
    expect(screen.getByLabelText('cancelled').textContent).toBe('✕');
  });

  it('in_progress background contains conic-gradient with amber', () => {
    render(<StatusIcon status="in_progress" />);
    const el = screen.getByLabelText('in_progress') as HTMLElement;
    expect(el.style.background).toContain('conic-gradient');
    expect(el.style.background).toContain('var(--amber)');
  });

  it('in_review background contains conic-gradient with blue', () => {
    render(<StatusIcon status="in_review" />);
    const el = screen.getByLabelText('in_review') as HTMLElement;
    expect(el.style.background).toContain('conic-gradient');
    expect(el.style.background).toContain('var(--blue)');
  });
});

describe('PriorityIcon', () => {
  it.each([
    'no_priority', 'low', 'medium', 'high', 'urgent',
  ] as const)('renders priority=%s with aria-label', (priority) => {
    render(<PriorityIcon priority={priority} />);
    expect(screen.getByLabelText(priority)).toBeInTheDocument();
  });

  it('urgent shows ! with amber background', () => {
    render(<PriorityIcon priority="urgent" />);
    const el = screen.getByLabelText('urgent');
    expect(el.textContent).toBe('!');
    expect(el).toHaveStyle({ background: 'var(--amber)' });
  });

  it('high priority has more filled bars than low priority', () => {
    const { container: highContainer } = render(<PriorityIcon priority="high" />);
    const highBars = Array.from(highContainer.querySelectorAll('[aria-label="high"] > span')) as HTMLElement[];
    const highFilled = highBars.filter(b => b.style.background === 'var(--fg2)');

    const { container: lowContainer } = render(<PriorityIcon priority="low" />);
    const lowBars = Array.from(lowContainer.querySelectorAll('[aria-label="low"] > span')) as HTMLElement[];
    const lowFilled = lowBars.filter(b => b.style.background === 'var(--fg2)');

    expect(highFilled).toHaveLength(3);
    expect(lowFilled).toHaveLength(1);
    expect(highFilled.length).toBeGreaterThan(lowFilled.length);
  });
});

describe('LabelChip', () => {
  it('renders label name', () => {
    render(<LabelChip name="Bug" color="#eb5757" />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });
});

describe('ProjectPill', () => {
  it('renders project name', () => {
    render(<ProjectPill name="Unified Inbox" color="#5b8def" />);
    expect(screen.getByText('Unified Inbox')).toBeInTheDocument();
  });
});

describe('TeamTile', () => {
  it('renders identifier', () => {
    render(<TeamTile identifier="PLT" color="#6d69f2" size={34} />);
    expect(screen.getByText('PLT')).toBeInTheDocument();
  });
});
