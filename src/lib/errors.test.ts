import { describe, expect, it } from 'vitest';
import { humanError } from './errors';

describe('humanError', () => {
  it('переводит отказ RLS на понятный язык', () => {
    expect(() => humanError({ message: 'new row violates row-level security policy' })).toThrow(
      'Действие запрещено правами доступа',
    );
  });

  it('переводит отказ в правах', () => {
    expect(() => humanError({ message: 'permission denied for table tasks' })).toThrow(
      'Недостаточно прав для этого действия',
    );
  });

  it('переводит дубликат', () => {
    expect(() => humanError({ message: 'duplicate key value violates unique constraint' })).toThrow(
      'Такая запись уже существует',
    );
  });

  it('оставляет русские сообщения базы как есть', () => {
    expect(() => humanError({ message: 'Переход из статуса new в статус review запрещён' })).toThrow(
      'Переход из статуса new в статус review запрещён',
    );
  });

  it('подставляет текст, если ошибки нет', () => {
    expect(() => humanError(null)).toThrow('Неизвестная ошибка');
  });
});

