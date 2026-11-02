import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';
import { AvatarStack } from './AvatarStack';
import { LabelChip } from './LabelChip';
import { PriorityIcon } from './PriorityIcon';
import { PropertyRow } from './PropertyRow';
import { ProjectPill } from './ProjectPill';
import { StatusIcon } from './StatusIcon';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../features/issues/issueMeta';
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
    expect(screen.getByRole('img', { name: `Status: ${STATUS_LABELS[status]}` })).toBeInTheDocument();
  });

  it('backlog has dashed border', () => {
    render(<StatusIcon status="backlog" />);
    const el = screen.getByRole('img', { name: 'Status: Backlog' }) as HTMLElement;
    expect(el.style.border).toBe('2px dashed var(--fg3)');
  });

  it('todo has solid border', () => {
    render(<StatusIcon status="todo" />);
    const el = screen.getByRole('img', { name: 'Status: Todo' }) as HTMLElement;
    expect(el.style.border).toBe('2px solid var(--fg3)');
  });

  it('done textContent is checkmark', () => {
    render(<StatusIcon status="done" />);
    expect(screen.getByRole('img', { name: 'Status: Done' }).textContent).toBe('✓');
  });

  it('cancelled textContent is cross', () => {
    render(<StatusIcon status="cancelled" />);
    expect(screen.getByRole('img', { name: 'Status: Cancelled' }).textContent).toBe('✕');
  });

  it('in_progress background contains conic-gradient with amber', () => {
    render(<StatusIcon status="in_progress" />);
    const el = screen.getByRole('img', { name: 'Status: In Progress' }) as HTMLElement;
    expect(el.style.background).toContain('conic-gradient');
    expect(el.style.background).toContain('var(--amber)');
  });

  it('in_review background contains conic-gradient with green', () => {
    render(<StatusIcon status="in_review" />);
    const el = screen.getByRole('img', { name: 'Status: In Review' }) as HTMLElement;
    expect(el.style.background).toContain('conic-gradient');
    expect(el.style.background).toContain('var(--green)');
  });

  it('done uses the on-accent colour for its check (contrast in dark)', () => {
    render(<StatusIcon status="done" />);
    expect((screen.getByRole('img', { name: 'Status: Done' }) as HTMLElement).style.color).toBe('var(--on-accent)');
  });
});

describe('PriorityIcon', () => {
  it.each([
    'no_priority', 'low', 'medium', 'high', 'urgent',
  ] as const)('renders priority=%s with aria-label', (priority) => {
    render(<PriorityIcon priority={priority} />);
    expect(screen.getByRole('img', { name: priority === 'no_priority' ? 'No priority' : `Priority: ${PRIORITY_LABELS[priority]}` })).toBeInTheDocument();
  });

  it('urgent shows ! on a red square', () => {
    render(<PriorityIcon priority="urgent" />);
    const el = screen.getByRole('img', { name: 'Priority: Urgent' });
    expect(el.textContent).toBe('!');
    expect(el).toHaveStyle({ background: 'var(--red)' });
  });

  it('high priority has more filled bars than low priority', () => {
    const { container: highContainer } = render(<PriorityIcon priority="high" />);
    const highBars = Array.from(highContainer.querySelectorAll('[aria-label="Priority: High"] > span')) as HTMLElement[];
    const highFilled = highBars.filter(b => b.style.background === 'var(--prio-bar, var(--fg))');

    const { container: lowContainer } = render(<PriorityIcon priority="low" />);
    const lowBars = Array.from(lowContainer.querySelectorAll('[aria-label="Priority: Low"] > span')) as HTMLElement[];
    const lowFilled = lowBars.filter(b => b.style.background === 'var(--prio-bar, var(--fg))');

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

describe('PropertyRow', () => {
  it('defaults the label column to 96px and accepts a labelWidth', () => {
    const { rerender } = render(<PropertyRow label="Status"><span>v</span></PropertyRow>);
    expect(screen.getByText('Status').style.width).toBe('96px');
    rerender(<PropertyRow label="Status" labelWidth={80}><span>v</span></PropertyRow>);
    expect(screen.getByText('Status').style.width).toBe('80px');
  });
});

describe('G3a: labels on user colours use readableOn', () => {
    it('TeamTile and Avatar write ink on a pale colour and keep white on a deep one', () => {
        const { container } = render(<><TeamTile identifier="AM" color="#e0a13a" /><TeamTile identifier="IN" color="#6366f1" /></>);
        const [amber, indigo] = Array.from(container.children) as HTMLElement[];
        expect(amber.style.color).toBe('var(--on-hi)');
        expect(indigo.style.color).toBe('rgb(255, 255, 255)');
        render(<Avatar initials="GR" color="#4bab66" size={24} title="Green" />);
        expect(screen.getByTitle('Green').style.color).toBe('var(--on-hi)');
    });
});

describe('G3c: TeamTile long identifiers', () => {
    it('G3c: shows only what fits — three characters from 34px up, two below — and keeps the full key in the title', () => {
        render(<><TeamTile identifier="PLATFORM" color="#6d69f2" /><TeamTile identifier="SUPPORT" color="#6d69f2" size={30} /></>);
        expect(screen.getByTitle('PLATFORM')).toHaveTextContent(/^PLA$/);
        expect(screen.getByTitle('SUPPORT')).toHaveTextContent(/^SU$/);
    });
});

describe('G3c icon labels', () => {
  it('G3c: StatusIcon is an img named "Status: <Label>" and no raw code remains', () => {
    const cases = [
      ['backlog', 'Status: Backlog'], ['todo', 'Status: Todo'], ['in_progress', 'Status: In Progress'],
      ['in_review', 'Status: In Review'], ['done', 'Status: Done'], ['cancelled', 'Status: Cancelled'],
    ] as const;
    for (const [status, name] of cases) {
      const { unmount } = render(<StatusIcon status={status} />);
      expect(screen.getByRole('img', { name })).toBeInTheDocument();
      expect(screen.queryByLabelText(status, { exact: true })).toBeNull();
      unmount();
    }
  });

  it('G3c: PriorityIcon is an img named "Priority: <Label>" (no_priority: "No priority") and no raw code remains', () => {
    const cases = [
      ['urgent', 'Priority: Urgent'], ['high', 'Priority: High'], ['medium', 'Priority: Medium'],
      ['low', 'Priority: Low'], ['no_priority', 'No priority'],
    ] as const;
    for (const [priority, name] of cases) {
      const { unmount } = render(<PriorityIcon priority={priority} />);
      expect(screen.getByRole('img', { name })).toBeInTheDocument();
      expect(screen.queryByLabelText(priority, { exact: true })).toBeNull();
      unmount();
    }
  });
});
