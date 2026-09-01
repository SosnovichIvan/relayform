import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeToggle } from './themeToggle';

describe('ThemeToggle', () => {
  it('switches the semantic document theme and persists the choice', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Тёмная тема' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('relayformTheme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Светлая тема' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
