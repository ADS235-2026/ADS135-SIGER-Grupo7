import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SIGER dashboard', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /siger/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
});
