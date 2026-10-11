begin;
create table private.rate_limits(key_hash text primary key, hits int not null, expires_at timestamptz not null);
alter table private.rate_limits enable row level security;
create function public.consume_limit(p_key text,p_limit int,p_seconds int) returns boolean
language plpgsql security definer set search_path='' as $$
declare n int; begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_key !~ '^[a-f0-9]{64}$' or p_limit not between 1 and 1000 or p_seconds not between 1 and 86400 then raise exception 'Invalid limit'; end if;
 delete from private.rate_limits where expires_at<now();
 insert into private.rate_limits(key_hash,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key_hash) do update set hits=private.rate_limits.hits+1 returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.consume_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.consume_limit(text,int,int) to service_role;

create function private.schedule_lock() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.businesses where id=case when tg_op='DELETE' then old.business_id else new.business_id end for update;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger availability_lock before insert or update or delete on public.availability for each row execute function private.schedule_lock();
create trigger services_lock before insert or update or delete on public.services for each row execute function private.schedule_lock();

create function private.replace_availability(p_business uuid,p_windows jsonb) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not private.owns_business(p_business) then raise exception 'Forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_windows)<>'array' or jsonb_array_length(p_windows)>28 then raise exception 'Invalid schedule' using errcode='22023'; end if;
 perform 1 from public.businesses where id=p_business for update;
 delete from public.availability where business_id=p_business;
 insert into public.availability(business_id,weekday,start_minute,end_minute)
 select p_business,weekday,start_minute,end_minute from jsonb_to_recordset(p_windows) as w(weekday int,start_minute int,end_minute int);
 insert into public.audit_events(business_id,actor_id,action) values(p_business,auth.uid(),'availability.updated');
end $$;
create function public.replace_availability(p_business uuid,p_windows jsonb) returns void
language sql security invoker set search_path='' as $$ select private.replace_availability(p_business,p_windows); $$;
create function private.remove_block(p_entry uuid) returns void language plpgsql security definer set search_path='' as $$
declare b uuid; begin
 select business_id into b from public.calendar_entries where id=p_entry and kind='block';
 if not private.owns_business(b) then raise exception 'Forbidden' using errcode='42501'; end if;
 perform 1 from public.businesses where id=b for update;
 update public.calendar_entries set status='canceled' where id=p_entry and kind='block';
 insert into public.audit_events(business_id,actor_id,action,record_id) values(b,auth.uid(),'block.removed',p_entry);
end $$;
create function public.remove_block(p_entry uuid) returns void language sql security invoker set search_path='' as $$ select private.remove_block(p_entry); $$;
revoke all on function private.schedule_lock(),private.replace_availability(uuid,jsonb),private.remove_block(uuid) from public,anon;
revoke all on function public.replace_availability(uuid,jsonb),public.remove_block(uuid) from public,anon;
grant execute on function private.replace_availability(uuid,jsonb),private.remove_block(uuid),public.replace_availability(uuid,jsonb),public.remove_block(uuid) to authenticated;
-- Explicit server-only policies document intentional deny-by-default internal tables.
create policy server_events on private.payment_events for all to service_role using(true) with check(true);
create policy server_limits on private.rate_limits for all to service_role using(true) with check(true);
commit;
