'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import type { Destination } from '@/entities/destination';
import type { Relayform } from '@/entities/form';
import { DestinationSelector, type DestinationDraft } from '@/features/connectDestination/ui/destinationSelector';

export function FormEditor({ projectId, formId }: { projectId: string; formId?: string }) {
  const router = useRouter();
  const [name, setName] = useState('Форма обратной связи');
  const [siteUrl, setSiteUrl] = useState('https://example.ru/contact');
  const [destinations, setDestinations] = useState<DestinationDraft[]>([]);
  const [original, setOriginal] = useState<Destination[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'error'>(formId ? 'loading' : 'ready');
  const [activationUrl, setActivationUrl] = useState('');
  const [isEmailActivationSent, setIsEmailActivationSent] = useState(false);
  const [vkActivation, setVkActivation] = useState<{ communityUrl: string; command: string }>();
  const [vkCheckState, setVkCheckState] = useState<'idle' | 'checking' | 'pending' | 'error'>('idle');
  const [maxActivationUrl, setMaxActivationUrl] = useState('');
  const [maxCheckState, setMaxCheckState] = useState<'idle' | 'checking' | 'pending' | 'error'>('idle');

  useEffect(() => {
    if (!formId) return;
    queueMicrotask(() => void Promise.all([
      fetch(`/api/forms/${encodeURIComponent(formId)}`),
      fetch(`/api/forms/${encodeURIComponent(formId)}/destinations`),
    ]).then(async ([formResponse, destinationResponse]) => {
      if (formResponse.status === 401) return router.replace('/login');
      if (!formResponse.ok || !destinationResponse.ok) throw new Error();
      const form = await formResponse.json() as Relayform;
      const payload = await destinationResponse.json() as { destinations: Destination[] };
      setName(form.name);
      setSiteUrl(form.siteUrl);
      setDestinations(payload.destinations);
      setOriginal(payload.destinations);
      setState('ready');
    }).catch(() => setState('error')));
  }, [formId, router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !isHttpUrl(siteUrl) || destinations.some((item) => item.provider === 'email' && !item.recipient.trim())) return setState('error');
    setState('saving');
    setActivationUrl('');
    setIsEmailActivationSent(false);
    setVkActivation(undefined);
    setVkCheckState('idle');
    setMaxActivationUrl('');
    setMaxCheckState('idle');
    try {
      const formResponse = await fetch(formId ? `/api/forms/${encodeURIComponent(formId)}` : `/api/projects/${encodeURIComponent(projectId)}/forms`, {
        method: formId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, siteUrl }),
      });
      if (formResponse.status === 401) return router.replace('/login');
      if (!formResponse.ok) throw new Error();
      const saved = await formResponse.json() as Relayform;

      for (const removed of original.filter((item) => !destinations.some((draft) => draft.id === item.id))) {
        await requiredFetch(`/api/destinations/${encodeURIComponent(removed.id)}`, { method: 'DELETE' });
      }

      const persisted: Destination[] = [];
      for (const draft of destinations) {
        const existing = original.find((item) => item.id === draft.id);
        if (existing && existing.provider !== 'email') {
          persisted.push(existing);
        } else {
          const response = existing
            ? await requiredFetch(`/api/destinations/${encodeURIComponent(existing.id)}`, json('PATCH', { recipient: draft.recipient }))
            : await requiredFetch(`/api/forms/${encodeURIComponent(saved.id)}/destinations`, json('POST', { provider: draft.provider, recipient: draft.recipient }));
          persisted.push(await response.json() as Destination);
        }
      }

      const telegram = persisted.find((item) => item.provider === 'telegram' && item.status !== 'active');
      const email = persisted.find((item) => item.provider === 'email' && item.status !== 'active');
      const vk = persisted.find((item) => item.provider === 'vk' && item.status !== 'active');
      const max = persisted.find((item) => item.provider === 'max' && item.status !== 'active');
      let hasActivationInstruction = false;
      if (telegram) {
        const response = await requiredFetch(`/api/destinations/${encodeURIComponent(telegram.id)}/telegramActivation`, { method: 'POST' });
        setActivationUrl((await response.json() as { activationUrl: string }).activationUrl);
        hasActivationInstruction = true;
      }
      if (email) {
        await requiredFetch(`/api/destinations/${encodeURIComponent(email.id)}/emailActivation`, { method: 'POST' });
        setIsEmailActivationSent(true);
        hasActivationInstruction = true;
      }
      if (vk) {
        const response = await requiredFetch(`/api/destinations/${encodeURIComponent(vk.id)}/vkActivation`, { method: 'POST' });
        const activation = await response.json() as { status: 'active' } | { status: 'pendingActivation'; communityUrl: string; command: string };
        if (activation.status === 'pendingActivation') {
          setVkActivation({ communityUrl: activation.communityUrl, command: activation.command });
          hasActivationInstruction = true;
        }
      }
      if (max) {
        const response = await requiredFetch(`/api/destinations/${encodeURIComponent(max.id)}/maxActivation`, { method: 'POST' });
        const activation = await response.json() as { status: 'active' } | { status: 'pendingActivation'; activationUrl: string };
        if (activation.status === 'pendingActivation') {
          setMaxActivationUrl(activation.activationUrl);
          hasActivationInstruction = true;
        }
      }

      setOriginal(persisted);
      if (hasActivationInstruction) setState('ready');
      else router.push('/cabinet');
    } catch {
      setState('error');
    }
  }

  async function checkVkActivation() {
    const vk = original.find((item) => item.provider === 'vk');
    if (!vk) return setVkCheckState('error');
    setVkCheckState('checking');
    try {
      const response = await fetch(`/api/destinations/${encodeURIComponent(vk.id)}/vkActivation`);
      if (response.status === 401) return router.replace('/login');
      if (!response.ok) throw new Error();
      const result = await response.json() as { status: 'pendingActivation' | 'active' };
      if (result.status === 'active') router.push('/cabinet');
      else setVkCheckState('pending');
    } catch {
      setVkCheckState('error');
    }
  }

  async function checkMaxActivation() {
    const max = original.find((item) => item.provider === 'max');
    if (!max) return setMaxCheckState('error');
    setMaxCheckState('checking');
    try {
      const response = await fetch(`/api/destinations/${encodeURIComponent(max.id)}/maxActivation`);
      if (response.status === 401) return router.replace('/login');
      if (!response.ok) throw new Error();
      const result = await response.json() as { status: 'pendingActivation' | 'active' };
      if (result.status === 'active') router.push('/cabinet');
      else setMaxCheckState('pending');
    } catch {
      setMaxCheckState('error');
    }
  }

  if (state === 'loading') return <p role="status">Загружаем форму…</p>;
  return <section>
    <button className="text-sm underline" type="button" onClick={() => router.push('/cabinet')}>← К списку форм</button>
    <h1 className="mt-5 text-3xl font-semibold">{formId ? 'Редактировать форму' : 'Создать форму'}</h1>
    {state === 'error' && <p className="mt-4 text-sm text-[var(--color-status-danger)]" role="alert">Не удалось сохранить данные. Проверьте поля и повторите.</p>}
    <form className="mt-6 max-w-2xl rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5" onSubmit={save}>
      <label className="block text-sm">Название формы<input required className="mt-2 w-full rounded-lg border border-[var(--color-border-default)] bg-transparent p-3" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="mt-4 block text-sm">Адрес сайта<input required className="mt-2 w-full rounded-lg border border-[var(--color-border-default)] bg-transparent p-3" type="url" value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} /></label>
      <div className="mt-5"><DestinationSelector value={destinations} onChange={setDestinations} /></div>
      {activationUrl && <p className="mt-4" role="status">Завершите подключение: <a className="underline" href={activationUrl} rel="noreferrer" target="_blank">открыть бота Telegram</a></p>}
      {isEmailActivationSent && <p className="mt-4 text-sm text-[var(--color-text-secondary)]" role="status">Письмо активации отправлено. Проверьте указанный e-mail.</p>}
      {vkActivation && <div className="mt-4 rounded-xl border border-[var(--color-border-default)] p-4"><p className="text-sm">Откройте <a className="underline" href={vkActivation.communityUrl} rel="noreferrer" target="_blank">сообщество Relayform в VK</a> и отправьте команду:</p><code className="mt-3 block overflow-x-auto rounded-lg bg-[var(--color-bg-page)] px-3 py-2 text-sm">{vkActivation.command}</code><button className="mt-3 rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm" disabled={vkCheckState === 'checking'} onClick={() => void checkVkActivation()} type="button">{vkCheckState === 'checking' ? 'Проверяем…' : 'Проверить подключение'}</button>{vkCheckState === 'pending' && <p className="mt-2 text-sm text-[var(--color-text-secondary)]" role="status">Пока не подключено. Отправьте команду со своего аккаунта VK.</p>}{vkCheckState === 'error' && <p className="mt-2 text-sm text-[var(--color-status-danger)]" role="alert">Не удалось проверить подключение.</p>}</div>}
      {maxActivationUrl && <div className="mt-4 rounded-xl border border-[var(--color-border-default)] p-4"><p className="text-sm">Откройте персональную ссылку и запустите бота Relayform в MAX.</p><a className="mt-3 inline-block underline" href={maxActivationUrl} rel="noreferrer" target="_blank">Открыть бота MAX</a><br /><button className="mt-3 rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm" disabled={maxCheckState === 'checking'} onClick={() => void checkMaxActivation()} type="button">{maxCheckState === 'checking' ? 'Проверяем MAX…' : 'Проверить подключение MAX'}</button>{maxCheckState === 'pending' && <p className="mt-2 text-sm text-[var(--color-text-secondary)]" role="status">Пока не подключено. Запустите бота со своего аккаунта MAX.</p>}{maxCheckState === 'error' && <p className="mt-2 text-sm text-[var(--color-status-danger)]" role="alert">Не удалось проверить подключение MAX.</p>}</div>}
      <button disabled={state === 'saving'} className="mt-5 rounded-lg bg-[var(--color-action-primary)] px-4 py-3 text-sm font-medium disabled:opacity-60" type="submit">{state === 'saving' ? 'Сохраняем…' : 'Сохранить форму'}</button>
    </form>
  </section>;
}

function isHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

function json(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

async function requiredFetch(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error();
  return response;
}
