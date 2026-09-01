'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center p-5"><section className="max-w-md rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6"><h1 className="text-2xl font-semibold">Не удалось открыть страницу</h1><p className="mt-3 text-sm text-[var(--color-text-secondary)]">Попробуйте ещё раз. Если ошибка повторится, вернитесь на главную страницу.</p><button className="mt-5 rounded-lg bg-[var(--color-action-primary)] px-4 py-3 text-sm font-medium" type="button" onClick={reset}>Повторить</button></section></main>;
}
