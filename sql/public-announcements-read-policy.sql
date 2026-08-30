grant select on public.announcements to anon;

drop policy if exists announcements_public_visible_read on public.announcements;
create policy announcements_public_visible_read
on public.announcements
for select
to anon
using (visibility_status = 'show');
