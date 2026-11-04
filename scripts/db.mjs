// Небольшой помощник для работы с базой Supabase из терминала.
// Запуск: node scripts/db.mjs migrate | node scripts/db.mjs sql "select 1"
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function env() {
  const out = {};
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

const { SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF } = env();

const hosts = [
  `aws-0-eu-west-1.pooler.supabase.com`,
  `aws-1-eu-west-1.pooler.supabase.com`,
  `db.${SUPABASE_PROJECT_REF}.supabase.co`,
];

async function connect() {
  let lastError;
  for (const host of hosts) {
    const client = new pg.Client({
      host,
      port: 5432,
      user: host.startsWith('db.') ? 'postgres' : `postgres.${SUPABASE_PROJECT_REF}`,
      password: SUPABASE_DB_PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      console.log(`подключено: ${host}`);
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
    }
  }
  throw lastError;
}

const client = await connect();
const [command, arg] = process.argv.slice(2);

if (command === 'migrate') {
  const dir = join(root, 'supabase', 'migrations');
  const only = arg;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (only && !file.includes(only)) continue;
    process.stdout.write(`${file} ... `);
    try {
      await client.query(readFileSync(join(dir, file), 'utf8'));
      console.log('ok');
    } catch (error) {
      console.log('ОШИБКА');
      console.error(error.message, '\n', error.position ?? '');
      process.exitCode = 1;
      break;
    }
  }
} else if (command === 'sql') {
  const result = await client.query(readFileSync(arg, 'utf8'));
  const rows = Array.isArray(result) ? result.at(-1)?.rows : result.rows;
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log('использование: migrate | sql <файл>');
}

await client.end();
