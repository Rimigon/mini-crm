import { describe, expect, it } from 'vitest';
import { pluralize } from './format';

describe('pluralize', () => {
  it('выбирает форму для одного предмета', () => {
    expect(pluralize(1, 'задача', 'задачи', 'задач')).toBe('задача');
    expect(pluralize(21, 'задача', 'задачи', 'задач')).toBe('задача');
  });

  it('выбирает форму для двух-четырёх', () => {
    expect(pluralize(2, 'задача', 'задачи', 'задач')).toBe('задачи');
    expect(pluralize(24, 'задача', 'задачи', 'задач')).toBe('задачи');
  });

  it('выбирает форму для пяти и больше', () => {
    expect(pluralize(5, 'задача', 'задачи', 'задач')).toBe('задач');
    expect(pluralize(11, 'задача', 'задачи', 'задач')).toBe('задач');
    expect(pluralize(0, 'задача', 'задачи', 'задач')).toBe('задач');
  });
});

