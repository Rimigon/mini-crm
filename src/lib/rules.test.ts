import { describe, expect, it } from 'vitest';
import { availableTaskActions, canReview } from './rules';

describe('availableTaskActions', () => {
  it('исполнитель берёт новую задачу в работу', () => {
    expect(availableTaskActions('new', 'worker', true)).toEqual(['take']);
  });

  it('исполнитель возвращает задачу с доработки в работу', () => {
    expect(availableTaskActions('rework', 'worker', true)).toEqual(['take']);
  });

  it('исполнитель отправляет задачу с работы на проверку', () => {
    expect(availableTaskActions('in_progress', 'worker', true)).toEqual(['submit']);
  });

  it('исполнитель ничего не делает с чужой задачей', () => {
    expect(availableTaskActions('new', 'worker', false)).toEqual([]);
  });

  it('постановщик принимает и возвращает только с проверки', () => {
    expect(availableTaskActions('review', 'manager', false)).toEqual(['accept', 'rework']);
  });

  it('постановщик не трогает статусы вне проверки', () => {
    for (const status of ['new', 'in_progress', 'rework', 'accepted'] as const) {
      expect(availableTaskActions(status, 'manager', false)).toEqual([]);
    }
  });
});

describe('canReview', () => {
  it('проверяет только постановщик и только на проверке', () => {
    expect(canReview('review', 'manager')).toBe(true);
    expect(canReview('review', 'worker')).toBe(false);
    expect(canReview('in_progress', 'manager')).toBe(false);
  });
});

