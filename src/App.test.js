import { render, screen } from '@testing-library/react';
import App from './App';

test('renders VM Creation Debugger title', () => {
  render(<App />);
  const titleElement = screen.getByText(/vm creation debugger/i);
  expect(titleElement).toBeInTheDocument();
});

