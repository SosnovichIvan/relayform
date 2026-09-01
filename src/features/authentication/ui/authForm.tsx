'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type AuthFormProps = { mode: 'login' | 'register' };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const isRegister = mode === 'register';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    if (!email.includes('@') || password.length < 8) return setError('Введите корректный e-mail и пароль не короче 8 символов.');
    setError(''); setIsPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        setError(payload.error === 'alreadyRegistered' ? 'Аккаунт с таким e-mail уже существует.' : payload.error === 'invalidCredentials' ? 'Неверный e-mail или пароль.' : 'Сервис временно недоступен. Попробуйте ещё раз.');
        return;
      }
      router.push('/cabinet'); router.refresh();
    } catch { setError('Сервис временно недоступен. Попробуйте ещё раз.'); }
    finally { setIsPending(false); }
  }
  return <main className="grid min-h-screen place-items-center p-5"><form noValidate className="w-full max-w-sm rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-7" onSubmit={submit}><Link className="font-semibold" href="/">relayform</Link><h1 className="mt-8 text-3xl font-semibold">{isRegister ? 'Создать аккаунт' : 'Войти в аккаунт'}</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{isRegister ? 'Начните принимать заявки за несколько минут.' : 'Управляйте формами и уведомлениями.'}</p><label className="mt-7 block text-sm">E-mail<input required className="mt-2 w-full rounded-lg border border-[var(--color-border-default)] bg-transparent p-3" type="email" name="email" autoComplete="email" /></label><label className="mt-4 block text-sm">Пароль<input required minLength={8} className="mt-2 w-full rounded-lg border border-[var(--color-border-default)] bg-transparent p-3" type="password" name="password" autoComplete={isRegister ? 'new-password' : 'current-password'} /></label>{error && <p className="mt-3 text-sm text-[var(--color-status-danger)]" role="alert">{error}</p>}<button disabled={isPending} className="mt-6 w-full rounded-lg bg-[var(--color-action-primary)] p-3 font-medium disabled:opacity-60" type="submit">{isPending ? 'Подождите…' : isRegister ? 'Создать аккаунт' : 'Войти'}</button><p className="mt-5 text-center text-sm text-[var(--color-text-secondary)]">{isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'} <Link className="underline" href={isRegister ? '/login' : '/register'}>{isRegister ? 'Войти' : 'Создать'}</Link></p></form></main>;
}
