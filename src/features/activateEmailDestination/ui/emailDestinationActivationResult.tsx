import Link from 'next/link';
import { ThemeToggle } from '@/shared/ui/themeToggle';

type ActivationStatus = 'confirmed' | 'invalid' | 'expired' | 'alreadyUsed' | 'unavailable';
const copy: Record<ActivationStatus, { title: string; description: string }> = {
  confirmed: { title: 'E-mail подключён', description: 'Теперь Relayform может отправлять уведомления о новых заявках на подтверждённый адрес.' },
  invalid: { title: 'Ссылка недействительна', description: 'Проверьте ссылку или отправьте новое письмо активации из настроек формы.' },
  expired: { title: 'Срок ссылки истёк', description: 'Ссылка действует 15 минут. Отправьте новое письмо активации из настроек формы.' },
  alreadyUsed: { title: 'E-mail уже подключён', description: 'Эта одноразовая ссылка уже использована, повторная активация не требуется.' },
  unavailable: { title: 'Не удалось подключить e-mail', description: 'Сервис временно недоступен. Попробуйте открыть письмо немного позже.' },
};

export function EmailDestinationActivationResult({ status }: { status: ActivationStatus }) {
  const content = copy[status];
  return <main className="grid min-h-screen place-items-center px-5 py-10"><section aria-live="polite" className="w-full max-w-lg rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-7 shadow-sm sm:p-10"><header className="flex items-center justify-between"><strong className="text-lg">relayform</strong><ThemeToggle /></header><p className="mt-12 text-sm text-[var(--color-text-secondary)]">Подключение канала</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{content.title}</h1><p className="mt-4 leading-7 text-[var(--color-text-secondary)]">{content.description}</p><Link className="mt-8 inline-flex rounded-xl bg-[var(--color-action-primary)] px-5 py-3 font-medium text-[var(--color-text-primary)]" href="/cabinet">Перейти в кабинет</Link></section></main>;
}
