// Сообщения базы уже написаны на русском языке и проверены в триггерах,
// поэтому показываем их как есть, а технические тексты переводим на человеческий.
export function humanError(error: { message: string; code?: string } | null): never {
  const message = error?.message ?? 'Неизвестная ошибка';

  if (message.includes('row-level security')) {
    throw new Error('Действие запрещено правами доступа');
  }
  if (message.includes('permission denied')) {
    throw new Error('Недостаточно прав для этого действия');
  }
  if (message.includes('duplicate key')) {
    throw new Error('Такая запись уже существует');
  }
  throw new Error(message);
}

