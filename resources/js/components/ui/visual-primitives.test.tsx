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
});

describe('PriorityIcon', () => {
  it.each([
    'no_priority', 'low', 'medium', 'high', 'urgent',
  ] as const)('renders priority=%s with aria-label', (priority) => {
    render(<PriorityIcon priority={priority} />);
    expect(screen.getByLabelText(priority)).toBeInTheDocument();
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
