-- Мелкая оптимизация после Performance Advisor:
-- индексы под внешние ключи и стабильные вызовы auth.uid() в политиках.

create index if not exists objects_created_by_idx on public.objects (created_by);
create index if not exists tasks_author_id_idx on public.tasks (author_id);
create index if not exists task_history_changed_by_idx on public.task_history (changed_by);

drop policy if exists objects_insert on public.objects;
create policy objects_insert on public.objects
  for insert to authenticated
  with check (public.is_manager() and created_by = (select auth.uid()));

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_manager() or assignee_id = (select auth.uid()));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_manager() and author_id = (select auth.uid()) and status = 'new');
