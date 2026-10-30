-- CivicPulse AI: run this whole file in Supabase Dashboard > SQL Editor
create extension if not exists pg_trgm;

create table departments (id serial primary key, name text unique not null);
insert into departments(name) values ('Public Works (Roads)'),('Water Supply Board'),('Electricity Board'),
 ('Sanitation Department'),('Police & Public Safety'),('General Administration');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'citizen' check (role in ('citizen','admin')),
  created_at timestamptz default now());

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function is_admin() returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;

create sequence complaint_seq start 1001;
create table complaints (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default ('CP-'||extract(year from now())::int||'-'||nextval('complaint_seq')),
  user_id uuid not null default auth.uid() references auth.users(id),
  description text not null check (length(description)>=8),
  location text not null,
  lat double precision, lng double precision,
  category text not null default 'General' check (category in ('Roads','Water','Electricity','Garbage','Public Safety','General')),
  priority text not null check (priority in ('High','Medium','Low')),
  status text not null default 'Submitted' check (status in ('Submitted','Under Review','In Progress','Resolved')),
  ai_method text default 'rule-based keyword scoring (no trained model)',
  ai_reason text,
  image_url text,
  department_id int references departments(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now());
create index on complaints using gin (description gin_trgm_ops);

create table status_history (
  id bigserial primary key,
  complaint_id uuid not null references complaints(id) on delete cascade,
  status text not null, changed_by uuid, changed_at timestamptz default now());

create table notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  complaint_id uuid references complaints(id) on delete cascade,
  message text not null, read boolean default false, created_at timestamptz default now());

-- Status history on insert; history + citizen notification whenever status changes
create function log_complaint_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into status_history(complaint_id,status,changed_by) values (new.id,new.status,auth.uid()); return new; end $$;
create trigger complaint_ins after insert on complaints for each row execute function log_complaint_insert();

create function log_complaint_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into status_history(complaint_id,status,changed_by) values (new.id,new.status,auth.uid());
    insert into notifications(user_id,complaint_id,message)
      values (new.user_id,new.id,'Complaint '||new.public_id||' is now "'||new.status||'".');
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger complaint_upd before update on complaints for each row execute function log_complaint_update();

-- ROW LEVEL SECURITY
alter table departments enable row level security;
alter table profiles enable row level security;
alter table complaints enable row level security;
alter table status_history enable row level security;
alter table notifications enable row level security;

create policy "departments readable" on departments for select using (true);
create policy "admin manages departments" on departments for all using (is_admin()) with check (is_admin());

create policy "own profile or admin" on profiles for select using (id=auth.uid() or is_admin());
create policy "update own name only" on profiles for update using (id=auth.uid())
  with check (id=auth.uid() and role=(select role from profiles where id=auth.uid()));

create policy "citizen reads own, admin reads all" on complaints for select using (user_id=auth.uid() or is_admin());
create policy "citizen inserts own submitted" on complaints for insert to authenticated
  with check (user_id=auth.uid() and status='Submitted' and department_id is null);
create policy "admin updates" on complaints for update using (is_admin()) with check (is_admin());

create policy "history own or admin" on status_history for select
  using (is_admin() or exists(select 1 from complaints c where c.id=complaint_id and c.user_id=auth.uid()));

create policy "own notifications" on notifications for select using (user_id=auth.uid());
create policy "mark own read" on notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());

-- PUBLIC, LIMITED-FIELD FUNCTIONS (never return user ids or emails)
create function track_complaint(p_id text) returns json language sql security definer set search_path=public stable as $$
  select json_build_object('public_id',c.public_id,'description',c.description,'location',c.location,
    'category',c.category,'priority',c.priority,'status',c.status,'image_url',c.image_url,
    'created_at',c.created_at,'ai_reason',c.ai_reason,'department',d.name,
    'history',(select coalesce(json_agg(json_build_object('status',h.status,'at',h.changed_at) order by h.changed_at),'[]'::json)
               from status_history h where h.complaint_id=c.id))
  from complaints c left join departments d on d.id=c.department_id where upper(c.public_id)=upper(trim(p_id)) $$;

create function public_complaints() returns table(public_id text,description text,location text,lat double precision,
  lng double precision,category text,priority text,status text,created_at timestamptz)
  language sql security definer set search_path=public stable as $$
  select c.public_id,c.description,c.location,c.lat,c.lng,c.category,c.priority,c.status,c.created_at
  from complaints c order by c.created_at desc $$;

-- Real text similarity computed inside PostgreSQL (pg_trgm trigram similarity)
create function find_similar(p_text text, p_location text) returns table(public_id text,description text,location text,
  category text,status text,score real) language sql security definer set search_path=public stable as $$
  select c.public_id,c.description,c.location,c.category,c.status,similarity(c.description,p_text) as score from complaints c
  where similarity(c.description,p_text)>0.25
     or (lower(trim(c.location))=lower(trim(p_location)) and similarity(c.description,p_text)>0.12)
  order by score desc limit 3 $$;

grant execute on function track_complaint(text), public_complaints(), find_similar(text,text) to anon, authenticated;

-- STORAGE: public-read bucket; users may only upload into their own folder
insert into storage.buckets(id,name,public) values ('complaint-images','complaint-images',true);
create policy "images public read" on storage.objects for select using (bucket_id='complaint-images');
create policy "users upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id='complaint-images' and (storage.foldername(name))[1]=auth.uid()::text);

-- MAKE YOURSELF ADMIN (after signing up in the app):
-- update profiles set role='admin' where id=(select id from auth.users where email='you@example.com');
