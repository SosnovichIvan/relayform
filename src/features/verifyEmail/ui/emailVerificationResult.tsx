import Link from 'next/link';
import { ThemeToggle } from '@/shared/ui/themeToggle';

type FailureStatus = 'invalid' | 'expired' | 'alreadyUsed' | 'unavailable';

const copy: Record<FailureStatus, { title: string; description: string }> = {
  invalid: { title: 'Ссылка недействительна', description: 'Проверьте, что ссылка скопирована полностью, или запросите новое письмо на исходном сайте.' },
  expired: { title: 'Срок ссылки истёк', description: 'Для безопасности ссылка действует 15 минут. Запросите новое письмо на исходном сайте.' },
  alreadyUsed: { title: 'Адрес уже подтверждён', description: 'Эта одноразовая ссылка уже была использована. Повторное подтверждение не требуется.' },
  unavailable: { title: 'Не удалось проверить ссылку', description: 'Сервис временно недоступен. Попробуйте открыть письмо ещё раз немного позже.' },
};

export function EmailVerificationResult({ status }: { status: FailureStatus }) {
  const content = copy[status];
  return <main className="grid min-h-screen place-items-center px-5 py-10"><section aria-live="polite" className="w-full max-w-lg rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-7 shadow-sm sm:p-10"><header className="flex items-center justify-between"><strong className="text-lg">relayform</strong><ThemeToggle /></header><p className="mt-12 text-sm text-[var(--color-text-secondary)]">Подтверждение e-mail</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{content.title}</h1><p className="mt-4 leading-7 text-[var(--color-text-secondary)]">{content.description}</p><Link className="mt-8 inline-flex rounded-xl bg-[var(--color-action-primary)] px-5 py-3 font-medium text-[var(--color-text-primary)]" href="/">Перейти в Relayform</Link></section></main>;
}
