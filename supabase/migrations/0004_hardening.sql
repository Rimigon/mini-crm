-- Уточнения после аудита: ограничения данных, проверка исполнителя при
-- переназначении, гигиена функций (search_path и права на вызов).

-- ------------------------------------------------------------- ограничения

alter table public.objects
  add constraint objects_name_length check (char_length(btrim(name)) between 1 and 120),
  add constraint objects_address_length check (char_length(btrim(address)) between 1 and 200);

alter table public.tasks
  add constraint tasks_title_length check (char_length(btrim(title)) between 1 and 140),
  add constraint tasks_description_length check (description is null or char_length(description) <= 2000);

alter table public.task_history
  add constraint task_history_comment_length check (comment is null or char_length(comment) <= 2000);

-- Исполнителя проверяем не только при создании, но и при переназначении.
create or replace function public.tasks_before_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role public.user_role;
  v_assignee_role public.user_role;
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

  if new.assignee_id is distinct from old.assignee_id then
    select role into v_assignee_role from public.profiles where id = new.assignee_id;
    if v_assignee_role is distinct from 'worker' then
      raise exception 'Исполнителем можно назначить только сотрудника с ролью «исполнитель»'
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

-- ------------------------------------------------------------ гигиена функций

create or replace function public.task_history_is_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.tasks t where t.id = old.task_id) then
    return old;
  end if;

  raise exception 'История изменений задачи защищена: запись нельзя изменить или удалить'
    using errcode = '42501';
end;
$$;

-- Триггерные функции не должны вызываться напрямую ни одной ролью API.
revoke all on function public.tasks_before_insert() from public;
revoke all on function public.tasks_before_update() from public;
revoke all on function public.tasks_write_history() from public;
revoke all on function public.task_history_is_immutable() from public;
