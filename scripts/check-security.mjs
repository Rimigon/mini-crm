// Проверка правил доступа так, как их увидит внешний клиент: подключаемся от
// имени роли authenticated и подставляем JWT-claims конкретного сотрудника.
// Запуск: node scripts/check-security.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
}

const MANAGER = '11111111-1111-4111-8111-111111111111';
const IVANOV = '22222222-2222-4222-8222-222222222222';
const PETROVA = '33333333-3333-4333-8333-333333333333';
const TASK_IVANOV_NEW = "'bbbbbbbb-0000-4000-8000-000000000003'";
const TASK_PETROVA_REVIEW = "'bbbbbbbb-0000-4000-8000-000000000002'";
const TASK_IVANOV_REWORK = "'bbbbbbbb-0000-4000-8000-000000000005'";

async function query(sql) {
  for (let attempt = 1; ; attempt += 1) {
    const client = new pg.Client({
      host: 'aws-0-eu-west-1.pooler.supabase.com',
      port: 5432,
      user: `postgres.${env.SUPABASE_PROJECT_REF}`,
      password: env.SUPABASE_DB_PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    client.on('error', () => {});
    try {
      await client.connect();
      const result = await client.query(sql);
      await client.end().catch(() => {});
      const parts = Array.isArray(result) ? result : [result];
      const withRows = parts.filter((part) => part.rows && part.rows.length > 0);
      return { rows: withRows.at(-1)?.rows ?? [] };
    } catch (error) {
      await client.end().catch(() => {});
      if (attempt < 5 && error.code === 'ECONNRESET') continue;
      return { error };
    }
  }
}

const asUser = (userId, body) => `
  begin;
  set local role authenticated;
  select set_config('request.jwt.claims', '${JSON.stringify({ sub: userId, role: 'authenticated' })}', true);
  ${body}
  rollback;`;

const cases = [];
const check = (label, expect, run) => cases.push({ label, expect, run });

check('исполнитель видит только свои задачи (4 из 7)', '4', async () =>
  (await query(asUser(IVANOV, `select count(*)::text as n from public.tasks;`))).rows?.[0]?.n);

check('исполнитель не видит чужую задачу по прямому id', '0', async () =>
  (await query(asUser(IVANOV, `select count(*)::text as n from public.tasks where id = ${TASK_PETROVA_REVIEW};`)))
    .rows?.[0]?.n);

check('исполнитель видит только свои объекты', '3', async () =>
  (await query(asUser(PETROVA, `select count(*)::text as n from public.objects;`))).rows?.[0]?.n);

check('исполнитель не может создать задачу', 'ошибка', async () => {
  const result = await query(asUser(IVANOV, `
    insert into public.tasks (object_id, title, assignee_id)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Своя задача', '${IVANOV}');`));
  return result.error ? 'ошибка' : 'прошло';
});

check('исполнитель не может переименовать свою задачу', '0', async () => {
  const result = await query(asUser(IVANOV, `
    create temp table _probe on commit drop as select 1 as x;
    with updated as (
      update public.tasks set title = 'Взлом'
      where assignee_id = '${IVANOV}'
      returning id
    )
    insert into _probe select 1 from updated;
    select (select count(*) - 1 from _probe)::text as changed;`));
  return result.error ? 'ошибка' : result.rows?.[0]?.changed;
});

check('исполнитель не может сменить статус прямым update', '0', async () => {
  const result = await query(asUser(IVANOV, `
    create temp table _probe on commit drop as select 1 as x;
    with updated as (
      update public.tasks set status = 'accepted'
      where assignee_id = '${IVANOV}' and status <> 'accepted'
      returning id
    )
    insert into _probe select 1 from updated;
    select (select count(*) - 1 from _probe)::text as changed;`));
  return result.error ? 'ошибка' : result.rows?.[0]?.changed;
});

check('исполнитель не может принять чужую задачу через функцию', 'ошибка', async () => {
  const result = await query(asUser(IVANOV, `select public.change_task_status(${TASK_PETROVA_REVIEW}, 'accepted', null);`));
  return result.error ? 'ошибка' : 'прошло';
});

check('исполнитель не может принять задачу на проверке', 'ошибка', async () => {
  const result = await query(asUser(IVANOV, `select public.change_task_status(${TASK_IVANOV_REWORK}, 'accepted', null);`));
  return result.error ? 'ошибка' : 'прошло';
});

check('исполнитель не может отправить на проверку новую задачу', 'ошибка', async () => {
  const result = await query(asUser(IVANOV, `select public.change_task_status(${TASK_IVANOV_NEW}, 'review', null);`));
  return result.error ? 'ошибка' : 'прошло';
});

check('исполнитель может взять свою задачу в работу', 'in_progress', async () => {
  const result = await query(asUser(IVANOV, `select (public.change_task_status(${TASK_IVANOV_NEW}, 'in_progress', null)).status::text as status;`));
  return result.error ? `ошибка: ${result.error.message}` : result.rows[0].status;
});

check('постановщик не может поменять статус в обход функции', 'ошибка', async () => {
  // В статус «Новая» не ведёт ни один переход, поэтому такой update обязан отбиться.
  const result = await query(asUser(MANAGER, `
    update public.tasks set status = 'new' where id = (select id from public.tasks order by id limit 1);`));
  return result.error ? 'ошибка' : 'прошло';
});

check('постановщик не может вернуть без комментария', 'ошибка', async () => {
  const result = await query(asUser(MANAGER, `select public.change_task_status(${TASK_PETROVA_REVIEW}, 'rework', '  ');`));
  return result.error ? 'ошибка' : 'прошло';
});

check('исполнитель не может править историю', 'ошибка', async () => {
  const result = await query(asUser(IVANOV, `update public.task_history set comment = 'подделка';`));
  return result.error ? 'ошибка' : 'прошло';
});

check('исполнитель не может удалить историю', 'ошибка', async () => {
  const result = await query(asUser(IVANOV, `delete from public.task_history;`));
  return result.error ? 'ошибка' : 'прошло';
});

check('историю нельзя изменить даже владельцу базы (триггер)', 'ошибка', async () => {
  const result = await query(`update public.task_history set comment = 'правка';`);
  return result.error ? 'ошибка' : 'прошло';
});

check('без входа таблицы недоступны', 'ошибка', async () => {
  const result = await query(`begin; set local role anon; select count(*) from public.tasks; rollback;`);
  return result.error ? 'ошибка' : 'прошло';
});

check('постановщик видит все задачи', '7', async () =>
  (await query(asUser(MANAGER, `select count(*)::text as n from public.tasks;`))).rows?.[0]?.n);

for (const item of cases) {
  const actual = await item.run();
  const ok = actual === item.expect;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${item.label} -> ${actual}`);
}
