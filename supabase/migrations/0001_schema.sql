-- Мини-CRM «Объекты и задачи»: схема данных.
-- Все объекты живут в schema public, доступ выдаётся только authenticated.

create type public.user_role as enum ('manager', 'worker');
create type public.task_status as enum ('new', 'in_progress', 'review', 'rework', 'accepted');

-- Профиль пользователя. Строка создаётся вручную (регистрация отключена),
-- хранение пароля и почты остаётся за auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  role public.user_role not null,
  created_at timestamptz not null default now()
);

-- Объект = стройка.
create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  address text not null check (length(btrim(address)) > 0),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Задача по объекту.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  assignee_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  author_id uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- История смены статусов. Пишется только триггером, изменить нельзя.
create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_status_idx on public.tasks (status);
create index task_history_task_id_idx on public.task_history (task_id, changed_at desc);
create index objects_name_idx on public.objects (name);
