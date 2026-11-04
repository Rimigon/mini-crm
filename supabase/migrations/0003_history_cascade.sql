-- История остаётся неизменяемой, но уходит вместе со своей задачей.
-- Удалить строку истории напрямую по-прежнему нельзя: разрешение даётся только
-- в момент каскадного удаления, когда родительской задачи уже нет.

create or replace function public.task_history_is_immutable()
returns trigger
language plpgsql
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
