import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BreachRiskCard } from './BreachRiskCard';
import type { BreachRiskRow, TagCount } from '../../lib/types';

const risk: BreachRiskRow = { ticket_id: 'abcdef123456', subject: 'Seat limit error', requester_name: 'Grace', target_minutes: 60, remaining_minutes: 42, pct: 70 };

describe('BreachRiskCard', () => {
    it('renders a risk row with the remaining badge, requester, and a tag chip', () => {
        render(<BreachRiskCard breachRisk={[risk]} tags={[{ name: 'sso', count: 7 }] as TagCount[]} />);
        expect(screen.getByText('Seat limit error')).toBeInTheDocument();
        expect(screen.getByText('Grace')).toBeInTheDocument();
        expect(screen.getByText('42m')).toBeInTheDocument();
        expect(screen.getByText('sso')).toBeInTheDocument();
    });

    it('renders an empty state when there is nothing at risk', () => {
        render(<BreachRiskCard breachRisk={[]} tags={[]} />);
        expect(screen.getByText(/nothing at risk|no tickets at risk/i)).toBeInTheDocument();
    });
});
