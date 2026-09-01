import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FailedDeliveryList } from './failedDeliveryList';

const failure = { id: 'a1', formId: 'f1', provider: 'telegram' as const, failureCode: 'providerUnavailable', isRetryable: true, failedAt: '2026-08-31T10:00:00.000Z' };

describe('FailedDeliveryList', () => {
  it('stays hidden without final failures', () => {
    render(<FailedDeliveryList failures={[]} formNames={{}} onReplay={() => undefined} replayErrorId="" replayingId="" />);
    expect(screen.queryByText('Неудачные доставки')).toBeNull();
  });

  it('shows only safe metadata and starts a replay', () => {
    const onReplay = vi.fn();
    render(<FailedDeliveryList failures={[failure]} formNames={{ f1: 'Форма заявки' }} onReplay={onReplay} replayErrorId="" replayingId="" />);
    expect(screen.getByText('Форма заявки · Telegram')).toBeDefined();
    expect(screen.getByText(/Сервис временно недоступен/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onReplay).toHaveBeenCalledWith('a1');
  });

  it('shows progress, fallback labels, invalid time and a row error', () => {
    render(<FailedDeliveryList failures={[{ ...failure, formId: 'missing', failureCode: 'unknown', failedAt: 'invalid' }]} formNames={{}} onReplay={() => undefined} replayErrorId="a1" replayingId="a1" />);
    expect(screen.getByText('Удалённая форма · Telegram')).toBeDefined();
    expect(screen.getByText('время неизвестно').closest('p')?.textContent).toContain('Ошибка доставки');
    expect((screen.getByRole('button', { name: 'Возвращаем…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert')).toBeDefined();
  });
});
