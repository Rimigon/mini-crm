// Наполнение проекта: сотрудники, объекты, задачи и настоящая история переходов.
// Скрипт собирает один SQL-сценарий и отправляет его одним запросом: так база
// получает всё за одну транзакцию, а обрыв соединения посреди сценария невозможен.
// Запуск: node scripts/seed.mjs
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

const { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF } = env;

const people = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'rudik@demo.ru', full_name: 'Сергей Рудик', role: 'manager' },
  { id: '22222222-2222-4222-8222-222222222222', email: 'ivanov@demo.ru', full_name: 'Алексей Иванов', role: 'worker' },
  { id: '33333333-3333-4333-8333-333333333333', email: 'petrova@demo.ru', full_name: 'Мария Петрова', role: 'worker' },
];
const PASSWORD = 'Demo1234';

const [manager, ivanov, petrova] = people.map((person) => person.id);

for (const person of people) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: person.id,
      email: person.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: person.full_name, role: person.role },
    }),
  });
  const text = await response.text();
  console.log(
    response.ok
      ? `создан ${person.email}`
      : text.includes('already been registered') || text.includes('already exists')
        ? `${person.email} уже есть`
        : `ошибка ${person.email}: ${text}`,
  );
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const claims = (userId) =>
  `select set_config('request.jwt.claims', ${quote(JSON.stringify({ sub: userId, role: 'authenticated' }))}, false);`;

const objects = [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'ЖК «Северный парк», корпус 3', address: 'г. Воскресенск, ул. Ленина, 12' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', name: 'Склад на Заводской', address: 'г. Воскресенск, ул. Заводская, 4' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000003', name: 'Школа №15, ремонт кровли', address: 'г. Коломна, ул. Октябрьской Революции, 4' },
];

const tasks = [
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    object: objects[0].id,
    title: 'Заказать бетон М300 на плиту',
    description: 'Нужно 18 м³, поставка до 14:00, с документами на партию.',
    assignee: ivanov,
    steps: [['in_progress', null]],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    object: objects[0].id,
    title: 'Согласовать схему армирования',
    description: 'Сверить схему из проекта с фактическими размерами котлована.',
    assignee: petrova,
    steps: [['in_progress', null], ['review', null]],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000003',
    object: objects[0].id,
    title: 'Принять плиту после заливки',
    description: 'Проверить отметки лазерным уровнем, сфотографировать углы.',
    assignee: ivanov,
    steps: [],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000004',
    object: objects[1].id,
    title: 'Разметить зоны хранения',
    description: 'Проходы не меньше двух метров, разметка несмываемой краской.',
    assignee: petrova,
    steps: [['in_progress', null], ['review', null], ['accepted', null]],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000005',
    object: objects[1].id,
    title: 'Смонтировать стеллажи',
    description: 'Шесть секций вдоль северной стены, крепление анкерами в пол.',
    assignee: ivanov,
    steps: [
      ['in_progress', null],
      ['review', null],
      ['rework', 'Не хватает анкеров на две секции, дозакажите и приложите фото крепления.'],
    ],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000006',
    object: objects[2].id,
    title: 'Заменить водостоки',
    description: 'Снять старые трубы, сдать на металл, поставить новые с уклоном.',
    assignee: petrova,
    steps: [],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000007',
    object: objects[2].id,
    title: 'Проверить крепление скатов',
    description: 'Осмотреть кровлю после ветра, отметить повреждённые листы.',
    assignee: ivanov,
    steps: [['in_progress', null]],
  },
];

const sql = ['begin;', claims(manager)];

for (const person of people) {
  sql.push(
    `insert into public.profiles (id, full_name, role) values (${quote(person.id)}, ${quote(person.full_name)}, ${quote(person.role)})
     on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;`,
  );
}

for (const object of objects) {
  sql.push(
    `insert into public.objects (id, name, address, created_by) values (${quote(object.id)}, ${quote(object.name)}, ${quote(object.address)}, ${quote(manager)})
     on conflict (id) do nothing;`,
  );
}

for (const task of tasks) {
  sql.push(
    `insert into public.tasks (id, object_id, title, description, assignee_id, status, author_id)
     values (${quote(task.id)}, ${quote(task.object)}, ${quote(task.title)}, ${quote(task.description)}, ${quote(task.assignee)}, 'new', ${quote(manager)})
     on conflict (id) do nothing;`,
  );

  for (const [status, comment] of task.steps) {
    const actor = ['accepted', 'rework'].includes(status) ? manager : task.assignee;
    sql.push(claims(actor));
    sql.push(
      `do $$ begin
         if (select status from public.tasks where id = ${quote(task.id)}) in (${expectedFrom(status).map(quote).join(', ')}) then
           perform public.change_task_status(${quote(task.id)}, ${quote(status)}, ${comment ? quote(comment) : 'null'});
         end if;
       end $$;`,
    );
  }
}

sql.push('commit;');

function expectedFrom(status) {
  return {
    in_progress: ['new', 'rework'],
    review: ['in_progress'],
    accepted: ['review'],
    rework: ['review'],
  }[status];
}

async function apply(attempt = 1) {
  const client = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${SUPABASE_PROJECT_REF}`,
    password: SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  client.on('error', () => {});
  try {
    await client.connect();
    await client.query(sql.join('\n'));
  } catch (error) {
    if (attempt < 4 && (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND')) {
      console.log(`обрыв соединения, попытка ${attempt + 1}`);
      await client.end().catch(() => {});
      return apply(attempt + 1);
    }
    throw error;
  }
  const counts = await client.query(
    `select (select count(*) from public.objects) objects,
            (select count(*) from public.tasks) tasks,
            (select count(*) from public.task_history) history`,
  );
  console.log(counts.rows[0]);
  await client.end().catch(() => {});
}

await apply();
