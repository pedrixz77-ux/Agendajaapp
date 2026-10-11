-- AgendaJá: development foundation. No payment provider or production deployment.
begin;
create extension if not exists btree_gist with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 1 and 100),
 created_at timestamptz not null default now()
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references public.profiles(id) on delete restrict,
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,47}$' and slug not in ('app','login','cadastro','api','conta','privacidade','termos','recuperar','auth')),
 name text not null check (char_length(name) between 2 and 100),
 description text not null default '' check (char_length(description)<=600),
 timezone text not null default 'America/Sao_Paulo',
 whatsapp text not null default '' check (whatsapp='' or whatsapp ~ '^[0-9]{10,15}$'),
 accent text not null default '#3A0F2E' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
 published boolean not null default false,
 buffer_minutes int not null default 0 check (buffer_minutes between 0 and 120),
 notice_minutes int not null default 60 check (notice_minutes between 0 and 10080),
 horizon_days int not null default 60 check (horizon_days between 1 and 180),
 cancellation_hours int not null default 24 check (cancellation_hours between 0 and 168),
 created_at timestamptz not null default now()
);
create table public.services (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 name text not null check (char_length(name) between 2 and 100),
 description text not null default '' check (char_length(description)<=600),
 price_cents int not null check (price_cents between 0 and 10000000),
 duration_minutes int not null check (duration_minutes between 5 and 720),
 active boolean not null default true,
 unique(business_id,id)
);
create table public.availability (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 weekday int not null check (weekday between 0 and 6),
 start_minute int not null check (start_minute between 0 and 1439),
 end_minute int not null check (end_minute between 1 and 1440),
 check(end_minute>start_minute),
 exclude using gist (business_id with =, weekday with =, int4range(start_minute,end_minute,'[)') with &&)
);
create table public.clients (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 name text not null check (char_length(name) between 2 and 100),
 phone text not null check (phone ~ '^[0-9]{10,15}$'),
 created_at timestamptz not null default now(),
 unique(business_id,phone), unique(business_id,id)
);
create table public.subscriptions (
 business_id uuid primary key references public.businesses(id) on delete restrict,
 status text not null default 'trialing' check(status in ('trialing','active','pending','past_due','canceled')),
 trial_ends_at timestamptz not null default now()+interval '7 days',
 current_period_end timestamptz,
 provider_customer_id text unique,
 provider_subscription_id text unique,
 price_cents int not null default 2990 check(price_cents=2990),
 updated_at timestamptz not null default now()
);
-- One occupancy table protects reservations AND manual blocks against each other.
create table public.calendar_entries (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 kind text not null check(kind in ('booking','block')),
 status text not null default 'confirmed' check(status in ('confirmed','canceled','completed','no_show')),
 client_id uuid,
 service_id uuid,
 service_name text,
 price_cents int,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 busy_until timestamptz not null,
 management_hash text,
 request_id uuid,
 created_at timestamptz not null default now(),
 check(ends_at>starts_at and busy_until>=ends_at),
 check(kind='block' or (client_id is not null and service_id is not null and service_name is not null and price_cents>=0)),
 foreign key(business_id,client_id) references public.clients(business_id,id),
 foreign key(business_id,service_id) references public.services(business_id,id),
 unique(business_id,request_id),
 exclude using gist (business_id with =, tstzrange(starts_at,busy_until,'[)') with &&) where(status<>'canceled')
);
create table public.audit_events (
 id bigint generated always as identity primary key,
 business_id uuid not null references public.businesses(id) on delete restrict,
 actor_id uuid,
 action text not null,
 record_id uuid,
 created_at timestamptz not null default now()
);
create table public.privacy_requests (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 requested_by uuid not null references auth.users(id),
 kind text not null check(kind in ('export','delete')),
 status text not null default 'pending' check(status in ('pending','processing','completed')),
 created_at timestamptz not null default now()
);
create table private.payment_events (
 provider_event_id text primary key,
 business_id uuid references public.businesses(id),
 event_type text not null,
 processed_at timestamptz not null default now()
);
create index calendar_business_start on public.calendar_entries(business_id,starts_at);
create index calendar_client on public.calendar_entries(business_id,client_id);
create index calendar_service on public.calendar_entries(business_id,service_id);
create index audit_business_time on public.audit_events(business_id,created_at desc);
create index privacy_business on public.privacy_requests(business_id);
create index privacy_requested_by on public.privacy_requests(requested_by);
create index payment_business on private.payment_events(business_id);

create function private.owns_business(p_business uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses where id=p_business and owner_id=(select auth.uid()));
$$;
create function private.validate_timezone() returns trigger
language plpgsql set search_path='' as $$ begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then
 raise exception 'Invalid timezone' using errcode='22023'; end if; return new; end $$;
create trigger valid_business_timezone before insert or update on public.businesses
for each row execute function private.validate_timezone();

-- Trial is created only by trusted database code; clients cannot extend it.
create function private.initialize_subscription() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into public.subscriptions(business_id) values(new.id); return new; end $$;
create trigger business_subscription after insert on public.businesses
for each row execute function private.initialize_subscription();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.clients enable row level security;
alter table public.subscriptions enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.audit_events enable row level security;
alter table public.privacy_requests enable row level security;
alter table private.payment_events enable row level security;

revoke all on public.profiles,public.businesses,public.services,public.availability,public.clients,public.subscriptions,public.calendar_entries,public.audit_events,public.privacy_requests from anon,authenticated;
grant select,insert on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select on public.businesses to authenticated;
grant insert(owner_id,slug,name,description,timezone,whatsapp,accent) on public.businesses to authenticated;
grant update(slug,name,description,timezone,whatsapp,accent,published,buffer_minutes,notice_minutes,horizon_days,cancellation_hours) on public.businesses to authenticated;
create policy business_read on public.businesses for select to authenticated using(owner_id=(select auth.uid()));
create policy business_insert on public.businesses for insert to authenticated with check(owner_id=(select auth.uid()));
create policy business_update on public.businesses for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant select,insert,update on public.services to authenticated;
create policy services_owner on public.services for all to authenticated using((select private.owns_business(business_id))) with check((select private.owns_business(business_id)));
grant select,insert,update,delete on public.availability to authenticated;
create policy availability_owner on public.availability for all to authenticated using((select private.owns_business(business_id))) with check((select private.owns_business(business_id)));
grant select on public.clients,public.subscriptions,public.calendar_entries,public.audit_events,public.privacy_requests to authenticated;
create policy clients_read on public.clients for select to authenticated using((select private.owns_business(business_id)));
create policy subscriptions_read on public.subscriptions for select to authenticated using((select private.owns_business(business_id)));
create policy calendar_read on public.calendar_entries for select to authenticated using((select private.owns_business(business_id)));
create policy audit_read on public.audit_events for select to authenticated using((select private.owns_business(business_id)));
create policy privacy_read on public.privacy_requests for select to authenticated using((select private.owns_business(business_id)));
grant insert(business_id,requested_by,kind) on public.privacy_requests to authenticated;
create policy privacy_insert on public.privacy_requests for insert to authenticated with check((select private.owns_business(business_id)) and requested_by=(select auth.uid()));

create function private.entitled(p_business uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.subscriptions where business_id=p_business and
 ((status='trialing' and trial_ends_at>now()) or (status in ('active','canceled') and current_period_end>now())));
$$;

-- This function checks business-local wall times, including DST crossings.
create function private.validate_slot(p_business uuid,p_service uuid,p_start timestamptz)
returns table(finish timestamptz,occupied_until timestamptz)
language plpgsql security invoker set search_path='' as $$
declare b public.businesses; s public.services; local_start timestamp; local_end timestamp; finish_at timestamptz; busy_at timestamptz;
begin
 select * into strict b from public.businesses where id=p_business;
 select * into s from public.services where id=p_service and business_id=b.id and active;
 if s.id is null then raise exception 'Service unavailable' using errcode='22023'; end if;
 if not private.entitled(b.id) then raise exception 'Subscription inactive' using errcode='42501'; end if;
 if not isfinite(p_start) or p_start<now()+make_interval(mins=>b.notice_minutes) or p_start>now()+make_interval(days=>b.horizon_days) then
 raise exception 'Outside booking window' using errcode='22023'; end if;
 finish_at:=p_start+make_interval(mins=>s.duration_minutes);
 busy_at:=finish_at+make_interval(mins=>b.buffer_minutes);
 local_start:=p_start at time zone b.timezone; local_end:=busy_at at time zone b.timezone;
 if date_trunc('minute',p_start)<>p_start or local_start::date<>local_end::date
 or extract(epoch from local_end-local_start)<>extract(epoch from busy_at-p_start)
 or not exists(select 1 from public.availability a where a.business_id=b.id
 and a.weekday=extract(dow from local_start)
 and a.start_minute<=extract(hour from local_start)*60+extract(minute from local_start)
 and a.end_minute>=extract(hour from local_end)*60+extract(minute from local_end)) then
 raise exception 'Outside availability' using errcode='22023'; end if;
 return query select finish_at,busy_at;
end $$;

create function private.reserve(p_business uuid,p_service uuid,p_start timestamptz,p_name text,p_phone text,p_request uuid,p_token_hash text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare b public.businesses; s public.services; slot record; client uuid; entry uuid; existing public.calendar_entries;
begin
 if auth.role() is distinct from 'service_role' and not private.owns_business(p_business) then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into strict b from public.businesses where id=p_business for update;
 if auth.role()='service_role' and not b.published then raise exception 'Page unavailable' using errcode='22023'; end if;
 if p_request is null or p_name is null or length(trim(p_name)) not between 2 and 100 or p_phone is null or p_phone !~ '^[0-9]{10,15}$' then raise exception 'Invalid booking details' using errcode='22023'; end if;
 if p_token_hash is not null and p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid token hash' using errcode='22023'; end if;
 select * into existing from public.calendar_entries where business_id=b.id and request_id=p_request;
 if existing.id is not null then
   if existing.service_id<>p_service or existing.starts_at<>p_start or existing.management_hash is distinct from p_token_hash then
    raise exception 'Idempotency conflict' using errcode='22023'; end if;
   return existing.id;
 end if;
 select * into slot from private.validate_slot(b.id,p_service,p_start);
 select * into strict s from public.services where id=p_service and business_id=b.id;
 insert into public.clients(business_id,name,phone) values(b.id,trim(p_name),p_phone)
 on conflict(business_id,phone) do update set phone=excluded.phone returning id into client;
 insert into public.calendar_entries(business_id,kind,client_id,service_id,service_name,price_cents,starts_at,ends_at,busy_until,management_hash,request_id)
 values(b.id,'booking',client,s.id,s.name,s.price_cents,p_start,slot.finish,slot.occupied_until,p_token_hash,p_request) returning id into entry;
 insert into public.audit_events(business_id,actor_id,action,record_id) values(b.id,auth.uid(),'booking.created',entry);
 return entry;
end $$;
create function public.reserve_appointment(p_business uuid,p_service uuid,p_start timestamptz,p_name text,p_phone text,p_request uuid,p_token_hash text default null)
returns uuid language sql security invoker set search_path='' as $$
 select private.reserve(p_business,p_service,p_start,p_name,p_phone,p_request,p_token_hash);
$$;

create function private.change_booking(p_entry uuid,p_start timestamptz default null,p_token_hash text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.calendar_entries; b public.businesses; slot record; owner boolean;
begin
 select * into e from public.calendar_entries where id=p_entry;
 if e.id is null then raise exception 'Booking unavailable' using errcode='22023'; end if;
 owner:=private.owns_business(e.business_id);
 if not owner and (auth.role() is distinct from 'service_role' or p_token_hash is null or e.management_hash is distinct from p_token_hash) then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into strict b from public.businesses where id=e.business_id for update;
 select * into strict e from public.calendar_entries where id=p_entry for update;
 if not owner and (p_token_hash is null or e.management_hash is distinct from p_token_hash) then raise exception 'Forbidden' using errcode='42501'; end if;
 if e.status<>'confirmed' or e.kind<>'booking' or e.starts_at<=now() then raise exception 'Booking unavailable' using errcode='22023'; end if;
 if not owner and now()>e.starts_at-make_interval(hours=>b.cancellation_hours) then raise exception 'Change deadline passed' using errcode='22023'; end if;
 if p_start is null then
 update public.calendar_entries set status='canceled',management_hash=null where id=e.id;
 else
 select * into slot from private.validate_slot(b.id,e.service_id,p_start);
 update public.calendar_entries set starts_at=p_start,ends_at=slot.finish,busy_until=slot.occupied_until where id=e.id;
 end if;
 insert into public.audit_events(business_id,actor_id,action,record_id) values(b.id,auth.uid(),case when p_start is null then 'booking.canceled' else 'booking.rescheduled' end,e.id);
 return e.id;
end $$;
create function public.change_appointment(p_entry uuid,p_start timestamptz default null,p_token_hash text default null)
returns uuid language sql security invoker set search_path='' as $$ select private.change_booking(p_entry,p_start,p_token_hash); $$;

create function private.block_time(p_business uuid,p_start timestamptz,p_end timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare entry uuid; begin
 if not private.owns_business(p_business) then raise exception 'Forbidden' using errcode='42501'; end if;
 perform 1 from public.businesses where id=p_business for update;
 if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end) or p_start<now() or p_end<=p_start or p_end>p_start+interval '180 days' then raise exception 'Invalid block' using errcode='22023'; end if;
 insert into public.calendar_entries(business_id,kind,starts_at,ends_at,busy_until) values(p_business,'block',p_start,p_end,p_end) returning id into entry;
 insert into public.audit_events(business_id,actor_id,action,record_id) values(p_business,auth.uid(),'block.created',entry);
 return entry;
end $$;
create function public.block_time(p_business uuid,p_start timestamptz,p_end timestamptz)
returns uuid language sql security invoker set search_path='' as $$ select private.block_time(p_business,p_start,p_end); $$;

-- Anonymous visitors never receive raw access to customer/booking tables or write RPCs.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.owns_business(uuid) to authenticated;
grant execute on function private.reserve(uuid,uuid,timestamptz,text,text,uuid,text),private.change_booking(uuid,timestamptz,text) to authenticated,service_role;
grant execute on function private.block_time(uuid,timestamptz,timestamptz) to authenticated;
revoke all on function public.reserve_appointment(uuid,uuid,timestamptz,text,text,uuid,text),public.change_appointment(uuid,timestamptz,text),public.block_time(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.reserve_appointment(uuid,uuid,timestamptz,text,text,uuid,text),public.change_appointment(uuid,timestamptz,text) to authenticated,service_role;
grant execute on function public.block_time(uuid,timestamptz,timestamptz) to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
commit;
