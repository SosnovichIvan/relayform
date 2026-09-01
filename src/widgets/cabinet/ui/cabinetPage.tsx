'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { emptyProjectDeliveryStats, removeFormDeliveryStats, type FormDeliveryStats, type ProjectDeliveryStats } from '@/entities/deliveryStats';
import type { FailedDelivery } from '@/entities/failedDelivery';
import type { Relayform } from '@/entities/form';
import type { Project } from '@/entities/project';
import { LogoutButton } from '@/features/authentication';
import { FailedDeliveryList } from '@/features/replayDelivery';
import { ThemeToggle } from '@/shared/ui/themeToggle';

type LoadState = 'loading' | 'ready' | 'error';
const providerLabels = { telegram: 'Telegram', vk: 'VK', max: 'MAX', email: 'E-mail' } as const;

export function CabinetPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [forms, setForms] = useState<Relayform[]>([]);
  const [stats, setStats] = useState<ProjectDeliveryStats>(emptyProjectDeliveryStats);
  const [failures, setFailures] = useState<FailedDelivery[]>([]);
  const [projectState, setProjectState] = useState<LoadState>('loading');
  const [dataState, setDataState] = useState<LoadState>('ready');
  const [actionError, setActionError] = useState(false);
  const [replayingAttemptId, setReplayingAttemptId] = useState('');
  const [replayErrorId, setReplayErrorId] = useState('');
  const isUnauthorized = useCallback((status: number) => { if (status === 401) router.replace('/login'); return status === 401; }, [router]);

  const loadProjects = useCallback(async () => {
    setProjectState('loading');
    try {
      const response = await fetch('/api/projects');
      if (isUnauthorized(response.status)) return;
      if (!response.ok) throw new Error();
      const payload = await response.json() as { projects: Project[] };
      setProjects(payload.projects);
      setSelectedProjectId((current) => current || payload.projects[0]?.id || '');
      setProjectState('ready');
    } catch { setProjectState('error'); }
  }, [isUnauthorized]);

  const loadProjectData = useCallback(async (projectId: string) => {
    if (!projectId) { setForms([]); setStats(emptyProjectDeliveryStats); setFailures([]); setDataState('ready'); return; }
    setDataState('loading');
    try {
      const [formsResponse, statsResponse, failuresResponse] = await Promise.all([fetch(`/api/projects/${encodeURIComponent(projectId)}/forms`), fetch(`/api/projects/${encodeURIComponent(projectId)}/deliveryStats`), fetch(`/api/projects/${encodeURIComponent(projectId)}/failedDeliveries`)]);
      if (isUnauthorized(formsResponse.status) || isUnauthorized(statsResponse.status) || isUnauthorized(failuresResponse.status)) return;
      if (!formsResponse.ok || !statsResponse.ok || !failuresResponse.ok) throw new Error();
      const formsPayload = await formsResponse.json() as { forms: Relayform[] };
      const statsPayload = await statsResponse.json() as ProjectDeliveryStats;
      const failuresPayload = await failuresResponse.json() as { failures: FailedDelivery[] };
      setForms(formsPayload.forms);
      setStats(statsPayload);
      setFailures(failuresPayload.failures);
      setActionError(false);
      setReplayErrorId('');
      setDataState('ready');
    } catch { setDataState('error'); }
  }, [isUnauthorized]);

  useEffect(() => { queueMicrotask(() => void loadProjects()); }, [loadProjects]);
  useEffect(() => { queueMicrotask(() => void loadProjectData(selectedProjectId)); }, [loadProjectData, selectedProjectId]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    if (!name) return;
    setProjectState('loading');
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
      if (isUnauthorized(response.status)) return;
      if (!response.ok) throw new Error();
      const project = await response.json() as Project;
      setProjects([project]); setSelectedProjectId(project.id); setProjectState('ready');
    } catch { setProjectState('error'); }
  }

  async function deleteForm(formId: string) {
    if (!window.confirm('Удалить форму и все её назначения?')) return;
    setActionError(false);
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(formId)}`, { method: 'DELETE' });
      if (isUnauthorized(response.status)) return;
      if (!response.ok) throw new Error();
      setForms((current) => current.filter((form) => form.id !== formId));
      setStats((current) => removeFormDeliveryStats(current, formId));
    } catch { setActionError(true); }
  }

  async function replayDelivery(attemptId: string) {
    setReplayingAttemptId(attemptId);
    setReplayErrorId('');
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(selectedProjectId)}/deliveryAttempts/${encodeURIComponent(attemptId)}/replay`, { method: 'POST' });
      if (isUnauthorized(response.status)) return;
      if (!response.ok) throw new Error();
      await loadProjectData(selectedProjectId);
    } catch { setReplayErrorId(attemptId); }
    finally { setReplayingAttemptId(''); }
  }

  return <main className="min-h-screen p-4 sm:p-8"><header className="mx-auto flex max-w-6xl items-center justify-between"><Link className="font-semibold" href="/">relayform</Link><div className="flex items-center gap-3"><ThemeToggle /><LogoutButton /></div></header><div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[180px_1fr]"><aside className="flex gap-2 text-sm lg:flex-col"><span className="rounded-lg bg-[var(--color-action-primary)] px-3 py-2">Формы</span><Link className="rounded-lg px-3 py-2" href="/cabinet/emails">Письма</Link></aside><section>{projectState === 'loading' ? <p role="status">Загружаем проекты…</p> : projectState === 'error' ? <ErrorState onRetry={loadProjects} /> : projects.length === 0 ? <ProjectForm onSubmit={createProject} /> : <><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><label className="text-sm text-[var(--color-text-secondary)]">Проект<select className="mt-2 block rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-[var(--color-text-primary)]" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><h1 className="mt-5 text-3xl font-semibold">Подключённые формы</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Статистика доставки за последние 30 дней</p></div><Link className="rounded-lg bg-[var(--color-action-primary)] px-4 py-3 text-sm font-medium" href={`/cabinet/form?projectId=${encodeURIComponent(selectedProjectId)}`}>Создать форму</Link></div>{dataState === 'loading' ? <p className="mt-6" role="status">Загружаем формы и статистику…</p> : dataState === 'error' ? <div className="mt-6"><ErrorState onRetry={() => loadProjectData(selectedProjectId)} /></div> : <>{actionError ? <div className="mt-6"><ErrorState onRetry={() => loadProjectData(selectedProjectId)} /></div> : null}<div aria-label="Статистика доставки" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4"><SummaryCard label="Всего сообщений" value={stats.total} /><SummaryCard label="Доставлено" value={stats.delivered} /><SummaryCard label="Ошибки" value={stats.failed} /><SummaryCard label="В очереди" value={stats.queued} /></div><FailedDeliveryList failures={failures} formNames={Object.fromEntries(forms.map((form) => [form.id, form.name]))} onReplay={(attemptId) => void replayDelivery(attemptId)} replayErrorId={replayErrorId} replayingId={replayingAttemptId} /><div className="mt-7 flex items-center justify-between"><h2 className="text-xl font-semibold">Формы</h2><span className="text-sm text-[var(--color-text-secondary)]">{forms.length} шт.</span></div>{forms.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border-default)] p-8 text-center"><h2 className="text-xl font-medium">Форм пока нет</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Создайте форму и подключите нужные каналы.</p></div> : <div className="mt-4 grid gap-3">{forms.map((form) => <FormCard form={form} key={form.id} onDelete={deleteForm} projectId={selectedProjectId} stats={stats.forms.find((item) => item.formId === form.id)} />)}</div>}</>}</>}</section></div></main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) { return <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"><strong className="text-2xl">{value}</strong><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{label}</p></article>; }

function FormCard({ form, onDelete, projectId, stats }: { form: Relayform; onDelete: (formId: string) => void; projectId: string; stats?: FormDeliveryStats }) { return <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{form.name}</h3><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{stats?.total ?? 0} сообщений · {stats?.delivered ?? 0} доставлено · {stats?.failed ?? 0} ошибок</p></div><div className="flex shrink-0 gap-1.5"><Link className="rounded-md border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs" href={`/cabinet/form?projectId=${encodeURIComponent(projectId)}&formId=${encodeURIComponent(form.id)}`}>Настроить</Link><button className="rounded-md px-2.5 py-1.5 text-xs text-[var(--color-status-danger)]" onClick={() => onDelete(form.id)} type="button">Удалить</button></div></div><div className="mt-4 flex flex-wrap gap-2">{stats?.providers.length ? stats.providers.map((provider) => <span className="rounded-full border border-[var(--color-border-default)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]" key={provider.provider}>{providerLabels[provider.provider]} · {provider.total}</span>) : <span className="text-xs text-[var(--color-text-secondary)]">Сообщений пока не было</span>}</div></article>; }

function ProjectForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <form className="max-w-lg rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6" onSubmit={onSubmit}><h1 className="text-3xl font-semibold">Создайте первый проект</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Проект объединяет формы одного сайта.</p><label className="mt-6 block text-sm">Название проекта<input className="mt-2 w-full rounded-lg border border-[var(--color-border-default)] bg-transparent p-3" name="name" required /></label><button className="mt-4 rounded-lg bg-[var(--color-action-primary)] px-4 py-3 text-sm font-medium">Создать проект</button></form>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div role="alert"><p>Не удалось загрузить данные.</p><button className="mt-3 underline" onClick={onRetry} type="button">Повторить</button></div>; }
