import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { IssuesHeader } from './IssuesHeader';

function wrap(ui: React.ReactNode, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<>{ui}</>} />
        <Route path="/board" element={<>{ui}</>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('IssuesHeader', () => {
  it('renders "Issues" title', () => {
    wrap(<IssuesHeader view="list" />);
    expect(screen.getByText('Issues')).toBeInTheDocument();
  });

  it('renders List and Board buttons via SegmentedControl', () => {
    wrap(<IssuesHeader view="list" />);
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument();
  });

  it('renders search button with ⌘K hint', () => {
    wrap(<IssuesHeader view="list" />);
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('dispatches ⌘K keydown when search button is clicked', () => {
    wrap(<IssuesHeader view="list" />);
    const spy = vi.fn();
    window.addEventListener('keydown', spy);
    const btn = screen.getByText('Search').closest('button')!;
    fireEvent.click(btn);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ key: 'k', metaKey: true }));
    window.removeEventListener('keydown', spy);
  });
});
