import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectDeliveryStats } from '@/entities/deliveryStats';
import { CabinetPage } from './cabinetPage';

const replace = vi.fn();
const router = { replace, push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/features/authentication', () => ({ LogoutButton: () => <button>Выйти</button> }));
vi.mock('@/shared/ui/themeToggle', () => ({ ThemeToggle: () => <button>Тема</button> }));

const zeroStats: ProjectDeliveryStats = { periodDays: 30, total: 0, delivered: 0, failed: 0, queued: 0, forms: [] };
const activeStats: ProjectDeliveryStats = { periodDays: 30, total: 12, delivered: 9, failed: 2, queued: 1, forms: [{ formId: 'f1', total: 12, delivered: 9, failed: 2, queued: 1, providers: [{ provider: 'telegram', total: 8, delivered: 7, failed: 1, queued: 0 }, { provider: 'email', total: 4, delivered: 2, failed: 1, queued: 1 }] }] };

describe('CabinetPage', () => {
  beforeEach(() => { replace.mockClear(); vi.unstubAllGlobals(); });

  it('loads persisted forms and real delivery statistics', async () => {
    vi.stubGlobal('fetch', api([{ id: 'p1', name: 'Site' }], { p1: [{ id: 'f1', projectId: 'p1', name: 'Lead form', siteUrl: 'https://example.ru' }] }, { p1: activeStats }));
    render(<CabinetPage />);
    expect(screen.getByRole('status').textContent).toContain('проекты');
    expect(await screen.findByText('Lead form')).toBeDefined();
    const summary = screen.getByLabelText('Статистика доставки');
    expect(within(summary).getByText('12')).toBeDefined();
    expect(within(summary).getByText('9')).toBeDefined();
    expect(screen.getByText('12 сообщений · 9 доставлено · 2 ошибок')).toBeDefined();
    expect(screen.getByText('Telegram · 8')).toBeDefined();
    expect(screen.getByText('E-mail · 4')).toBeDefined();
  });

  it('creates the first project and renders zero statistics', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ projects: [] }))
      .mockResolvedValueOnce(Response.json({ id: 'p1', name: 'First' }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ forms: [] }))
      .mockResolvedValueOnce(Response.json(zeroStats))
      .mockResolvedValueOnce(Response.json({ failures: [] }));
    vi.stubGlobal('fetch', request);
    render(<CabinetPage />);
    await screen.findByText('Создайте первый проект');
    fireEvent.change(screen.getByLabelText('Название проекта'), { target: { value: 'First' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Создать проект' }).closest('form')!);
    expect(await screen.findByText('Форм пока нет')).toBeDefined();
    expect(request.mock.calls[1][1].body).toContain('First');
    expect(within(screen.getByLabelText('Статистика доставки')).getAllByText('0')).toHaveLength(4);
  });

  it('switches projects and reloads both forms and statistics', async () => {
    const secondStats = { ...zeroStats, total: 3, delivered: 3, forms: [{ formId: 'f2', total: 3, delivered: 3, failed: 0, queued: 0, providers: [{ provider: 'vk' as const, total: 3, delivered: 3, failed: 0, queued: 0 }] }] };
    vi.stubGlobal('fetch', api([{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }], { p1: [{ id: 'f1', projectId: 'p1', name: 'First form' }], p2: [{ id: 'f2', projectId: 'p2', name: 'Second form' }] }, { p1: zeroStats, p2: secondStats }));
    render(<CabinetPage />);
    await screen.findByText('First form');
    fireEvent.change(screen.getByLabelText('Проект'), { target: { value: 'p2' } });
    expect(await screen.findByText('Second form')).toBeDefined();
    expect(screen.getByText('VK · 3')).toBeDefined();
  });

  it('retries project and paired data failures', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce(Response.json({ projects: [{ id: 'p1', name: 'Site' }] }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(Response.json(zeroStats))
      .mockResolvedValueOnce(Response.json({ failures: [] }))
      .mockResolvedValueOnce(Response.json({ forms: [] }))
      .mockResolvedValueOnce(Response.json(zeroStats))
      .mockResolvedValueOnce(Response.json({ failures: [] }));
    vi.stubGlobal('fetch', request);
    render(<CabinetPage />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(screen.getByLabelText('Проект')).toBeDefined());
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Форм пока нет')).toBeDefined();
  });

  it('returns unauthorized sessions to login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    render(<CabinetPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('shows an error when project creation fails and ignores a blank name', async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ projects: [] })).mockRejectedValueOnce(new Error());
    vi.stubGlobal('fetch', request);
    render(<CabinetPage />);
    await screen.findByText('Создайте первый проект');
    fireEvent.submit(screen.getByRole('button', { name: 'Создать проект' }).closest('form')!);
    expect(request).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('Название проекта'), { target: { value: 'Site' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Создать проект' }).closest('form')!);
    expect(await screen.findByRole('alert')).toBeDefined();
  });

  it('requires confirmation and subtracts a deleted form from statistics', async () => {
    const request = api([{ id: 'p1', name: 'Site' }], { p1: [{ id: 'f1', projectId: 'p1', name: 'Lead form', siteUrl: 'https://example.ru' }] }, { p1: activeStats }, 204);
    vi.stubGlobal('fetch', request);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<CabinetPage />);
    await screen.findByText('Lead form');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(request).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(screen.queryByText('Lead form')).toBeNull());
    expect(within(screen.getByLabelText('Статистика доставки')).getAllByText('0')).toHaveLength(4);
    confirm.mockRestore();
  });

  it('keeps a form and offers retry when deletion fails', async () => {
    const request = api([{ id: 'p1', name: 'Site' }], { p1: [{ id: 'f1', projectId: 'p1', name: 'Lead form', siteUrl: 'https://example.ru' }] }, { p1: activeStats }, 503);
    vi.stubGlobal('fetch', request);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CabinetPage />);
    await screen.findByText('Lead form');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeDefined();
    expect(screen.getByText('Lead form')).toBeDefined();
    confirm.mockRestore();
  });

  it('shows a redacted failure, replays it and refreshes project data', async () => {
    const failed = { id: 'a1', formId: 'f1', provider: 'telegram', failureCode: 'providerUnavailable', isRetryable: true, failedAt: '2026-08-31T10:00:00.000Z' };
    const request = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/deliveryAttempts/')) return Promise.resolve(Response.json({ status: 'queued' }, { status: 202 }));
      if (url === '/api/projects') return Promise.resolve(Response.json({ projects: [{ id: 'p1', name: 'Site' }] }));
      if (url.endsWith('/forms')) return Promise.resolve(Response.json({ forms: [{ id: 'f1', projectId: 'p1', name: 'Lead form', siteUrl: 'https://example.ru' }] }));
      if (url.endsWith('/deliveryStats')) return Promise.resolve(Response.json(activeStats));
      const replayCount = request.mock.calls.filter(([calledUrl, calledInit]) => String(calledUrl).includes('/deliveryAttempts/') && calledInit?.method === 'POST').length;
      return Promise.resolve(Response.json({ failures: replayCount ? [] : [failed] }));
    });
    vi.stubGlobal('fetch', request);
    render(<CabinetPage />);
    await screen.findByText('Неудачные доставки');
    expect(screen.getByText('Lead form · Telegram')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(screen.queryByText('Неудачные доставки')).toBeNull());
    expect(request).toHaveBeenCalledWith('/api/projects/p1/deliveryAttempts/a1/replay', { method: 'POST' });
  });

  it('keeps a failed delivery visible after replay failure and redirects unauthorized replay', async () => {
    const failure = { id: 'a1', formId: 'f1', provider: 'email', failureCode: 'providerRejected', isRetryable: false, failedAt: '2026-08-31T10:00:00.000Z' };
    const responses = (replayStatus: number) => vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/deliveryAttempts/')) return Promise.resolve(new Response('{}', { status: replayStatus }));
      if (url === '/api/projects') return Promise.resolve(Response.json({ projects: [{ id: 'p1', name: 'Site' }] }));
      if (url.endsWith('/forms')) return Promise.resolve(Response.json({ forms: [{ id: 'f1', projectId: 'p1', name: 'Lead form' }] }));
      if (url.endsWith('/deliveryStats')) return Promise.resolve(Response.json(activeStats));
      return Promise.resolve(Response.json({ failures: [failure] }));
    });
    vi.stubGlobal('fetch', responses(409));
    const first = render(<CabinetPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText(/Не удалось повторить доставку/)).toBeDefined();
    expect(screen.getByText('Lead form · E-mail')).toBeDefined();
    first.unmount();
    vi.stubGlobal('fetch', responses(401));
    render(<CabinetPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });
});

function api(projects: Array<{ id: string; name: string }>, forms: Record<string, unknown[]>, stats: Record<string, ProjectDeliveryStats>, deleteStatus = 204) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: deleteStatus }));
    if (url === '/api/projects') return Promise.resolve(Response.json({ projects }));
    const projectId = url.split('/')[3];
    if (url.endsWith('/deliveryStats')) return Promise.resolve(Response.json(stats[projectId] ?? zeroStats));
    if (url.endsWith('/failedDeliveries')) return Promise.resolve(Response.json({ failures: [] }));
    return Promise.resolve(Response.json({ forms: forms[projectId] ?? [] }));
  });
}
