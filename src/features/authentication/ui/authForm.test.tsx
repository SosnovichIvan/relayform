import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthForm } from './authForm';
const push = vi.fn(); const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
describe('AuthForm', () => {
  beforeEach(() => { push.mockClear(); refresh.mockClear(); vi.unstubAllGlobals(); });
  it('validates credentials', () => { render(<AuthForm mode="login" />); fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form')!); expect(screen.getByRole('alert').textContent).toContain('корректный e-mail'); });
  it('opens cabinet after login', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}'))); render(<AuthForm mode="login" />); fill('owner@relayform.ru'); fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form')!); await waitFor(() => expect(push).toHaveBeenCalledWith('/cabinet')); expect(refresh).toHaveBeenCalled(); });
  it.each([['alreadyRegistered', 'уже существует'], ['invalidCredentials', 'Неверный'], ['unavailable', 'недоступен']])('maps %s', async (error, message) => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error }), { status: 409 }))); render(<AuthForm mode="register" />); fill('owner@relayform.ru'); fireEvent.submit(screen.getByRole('button', { name: 'Создать аккаунт' }).closest('form')!); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message)); });
  it('handles network failure', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); render(<AuthForm mode="login" />); fill('a@b.ru'); fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form')!); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('недоступен')); });
});
function fill(email: string) { fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } }); fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password1' } }); }
