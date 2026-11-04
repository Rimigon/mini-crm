-- Доступ: RLS, триггеры целостности, единственная функция смены статуса.
-- Правила работают и при прямом обращении к PostgREST в обход интерфейса.

-- ---------------------------------------------------------------- помощники

-- Роль читается из profiles, а не из JWT: клиент не может подменить claim.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(public.current_user_role() = 'manager', false);
$$;

-- Исполнитель видит объект только если у него там есть задачи.
create or replace function public.has_tasks_on_object(p_object_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.tasks t
    where t.object_id = p_object_id and t.assignee_id = auth.uid()
  );
$$;

revoke all on function public.current_user_role(), public.is_manager(), public.has_tasks_on_object(uuid) from public;
grant execute on function public.current_user_role(), public.is_manager(), public.has_tasks_on_object(uuid) to authenticated;

-- ------------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

-- Профили: любой вошедший видит имена и роли, почты здесь нет.
-- Заводить и менять профили может только сервисный ключ: политик на запись нет.
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

-- Объекты: постановщик видит и меняет всё, исполнитель видит только свои.
create policy objects_select on public.objects
  for select to authenticated
  using (public.is_manager() or public.has_tasks_on_object(id));

create policy objects_insert on public.objects
  for insert to authenticated
  with check (public.is_manager() and created_by = auth.uid());

create policy objects_update on public.objects
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy objects_delete on public.objects
  for delete to authenticated
  using (public.is_manager());

-- Задачи: постановщик видит всё, исполнитель только назначенные ему.
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_manager() or assignee_id = auth.uid());

-- Создавать задачи может только постановщик и только на своё имя в авторах.
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_manager() and author_id = auth.uid() and status = 'new');

-- Редактировать карточку может только постановщик; статус меняется через
-- функцию change_task_status, прямой update по status закроет триггер.
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_manager());

-- История: читают участники, писать через API не может никто.
create policy task_history_select on public.task_history
  for select to authenticated
  using (
    public.is_manager()
    or exists (select 1 from public.tasks t where t.id = task_history.task_id)
  );

-- ------------------------------------------------------- права на таблицы

revoke all on public.profiles, public.objects, public.tasks, public.task_history from anon;
grant select, insert, update, delete on public.objects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.profiles to authenticated;
-- В историю пишет только триггер под владельцем таблицы.
grant select on public.task_history to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ----------------------------------------------------------- проверки DML

create or replace function public.tasks_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_assignee_role public.user_role;
begin
  if new.status <> 'new' then
    raise exception 'Новую задачу можно создать только в статусе «Новая»'
      using errcode = '42501';
  end if;

  select role into v_assignee_role from public.profiles where id = new.assignee_id;
  if v_assignee_role is distinct from 'worker' then
    raise exception 'Исполнителем можно назначить только сотрудника с ролью «исполнитель»'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.tasks_before_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'Профиль пользователя не найден' using errcode = '42501';
  end if;

  if new.id <> old.id
     or new.author_id <> old.author_id
     or new.created_at <> old.created_at then
    raise exception 'Автора, дату создания и идентификатор задачи менять нельзя'
      using errcode = '42501';
  end if;

  if v_role = 'worker' then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.object_id is distinct from old.object_id
       or new.assignee_id is distinct from old.assignee_id then
      raise exception 'Исполнитель может менять только статус задачи'
        using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    -- Единственный разрешённый путь: change_task_status выставляет флаг на транзакцию.
    if coalesce(current_setting('app.allow_status_change', true), 'off') <> 'on' then
      raise exception 'Статус меняется только действиями из карточки задачи'
        using errcode = '42501';
    end if;

    if not (
      (old.status = 'new' and new.status = 'in_progress')
      or (old.status = 'in_progress' and new.status = 'review')
      or (old.status = 'review' and new.status in ('accepted', 'rework'))
      or (old.status = 'rework' and new.status = 'in_progress')
    ) then
      raise exception 'Переход из статуса % в статус % запрещён', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_before_insert_trigger
  before insert on public.tasks
  for each row execute function public.tasks_before_insert();

create trigger tasks_before_update_trigger
  before update on public.tasks
  for each row execute function public.tasks_before_update();

-- История пишется только здесь, поэтому changed_by нельзя подделать.
create or replace function public.tasks_write_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_history (task_id, from_status, to_status, comment, changed_by)
    values (new.id, null, new.status, null, new.author_id);
  elsif new.status is distinct from old.status then
    insert into public.task_history (task_id, from_status, to_status, comment, changed_by)
    values (
      new.id,
      old.status,
      new.status,
      nullif(btrim(coalesce(current_setting('app.status_comment', true), '')), ''),
      auth.uid()
    );
  end if;
  return null;
end;
$$;

create trigger tasks_write_history_trigger
  after insert or update on public.tasks
  for each row execute function public.tasks_write_history();

-- Строку истории нельзя ни изменить, ни удалить, даже владельцу таблицы через API.
create or replace function public.task_history_is_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'История изменений задачи защищена: запись нельзя изменить или удалить'
    using errcode = '42501';
end;
$$;

create trigger task_history_immutable_trigger
  before update or delete on public.task_history
  for each row execute function public.task_history_is_immutable();

-- --------------------------------------------------- смена статуса (RPC)

create or replace function public.change_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_task public.tasks%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if v_uid is null then
    raise exception 'Требуется авторизация' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception 'Профиль пользователя не найден' using errcode = '42501';
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  if v_role = 'worker' and v_task.assignee_id <> v_uid then
    raise exception 'Задача назначена другому исполнителю' using errcode = '42501';
  end if;

  if p_new_status = v_task.status then
    raise exception 'Задача уже в этом статусе' using errcode = '42501';
  end if;

  if v_role = 'manager' then
    if not (v_task.status = 'review' and p_new_status in ('accepted', 'rework')) then
      raise exception 'Переход из статуса % в статус % для постановщика запрещён', v_task.status, p_new_status
        using errcode = '42501';
    end if;
  else
    if not (
      (v_task.status in ('new', 'rework') and p_new_status = 'in_progress')
      or (v_task.status = 'in_progress' and p_new_status = 'review')
    ) then
      raise exception 'Переход из статуса % в статус % для исполнителя запрещён', v_task.status, p_new_status
        using errcode = '42501';
    end if;
  end if;

  if p_new_status = 'rework' and v_comment is null then
    raise exception 'Возврат на доработку требует комментария' using errcode = '42501';
  end if;

  perform set_config('app.allow_status_change', 'on', true);
  perform set_config('app.status_comment', coalesce(v_comment, ''), true);

  update public.tasks set status = p_new_status where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

revoke all on function public.change_task_status(uuid, public.task_status, text) from public;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
