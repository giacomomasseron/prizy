import { render, screen } from '@testing-library/react';
import App from './App';

it('renders the app root', () => {
    render(<App />);
    expect(screen.getByTestId('app-root')).toBeInTheDocument();
});
