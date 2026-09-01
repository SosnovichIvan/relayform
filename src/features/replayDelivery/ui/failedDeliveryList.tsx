import type { FailedDelivery, FailedDeliveryProvider } from '@/entities/failedDelivery';

const providerLabels: Record<FailedDeliveryProvider, string> = { telegram: 'Telegram', vk: 'VK', max: 'MAX', email: 'E-mail' };
const failureLabels: Record<string, string> = {
  providerUnavailable: 'Сервис временно недоступен',
  providerRejected: 'Сервис отклонил сообщение',
  transportNotConfigured: 'Канал не настроен',
  invalidRecipient: 'Получатель недоступен',
  invalidMessage: 'Сообщение не прошло проверку',
  invalidConfiguration: 'Канал настроен неверно',
  unexpectedTransportFailure: 'Неожиданная ошибка доставки',
};

export function FailedDeliveryList({ failures, formNames, replayErrorId, replayingId, onReplay }: { failures: FailedDelivery[]; formNames: Record<string, string>; replayErrorId: string; replayingId: string; onReplay: (attemptId: string) => void }) {
  if (failures.length === 0) return null;
  return <section aria-labelledby="failed-deliveries-title" className="mt-7">
    <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold" id="failed-deliveries-title">Неудачные доставки</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Последние ошибки без содержимого заявок и данных получателей.</p></div><span className="text-sm text-[var(--color-text-secondary)]">{failures.length} шт.</span></div>
    <div className="mt-4 grid gap-3">{failures.map((failure) => <article className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between" key={failure.id}>
      <div className="min-w-0"><p className="font-medium">{formNames[failure.formId] ?? 'Удалённая форма'} · {providerLabels[failure.provider]}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{failureLabels[failure.failureCode] ?? 'Ошибка доставки'} · <time dateTime={failure.failedAt}>{formatFailureTime(failure.failedAt)}</time></p>{replayErrorId === failure.id && <p className="mt-2 text-sm text-[var(--color-status-danger)]" role="alert">Не удалось повторить доставку. Обновите данные и попробуйте снова.</p>}</div>
      <button className="self-start rounded-md border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs sm:self-auto" disabled={replayingId === failure.id} onClick={() => onReplay(failure.id)} type="button">{replayingId === failure.id ? 'Возвращаем…' : 'Повторить'}</button>
    </article>)}</div>
  </section>;
}

function formatFailureTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'время неизвестно' : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
