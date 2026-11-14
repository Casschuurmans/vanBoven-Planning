-- Van Boven Aannemers - Personeelsplanning
-- Plak dit hele bestand in Supabase > SQL Editor > New query en klik op Run.
-- Het is veilig om het opnieuw uit te voeren.

create extension if not exists pgcrypto;

-- Medewerkers
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  work_days int[] not null default '{1,2,3,4,5}',   -- 1 = maandag ... 5 = vrijdag
  availability text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Projecten en losse klussen
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number text not null default '',
  location text not null default '',
  start_date date,
  end_date date,
  status text not null default 'Voorbereiding'
    check (status in ('Voorbereiding','In uitvoering','Afgerond','On hold')),
  color text not null default '#0F7B6C',
  kind text not null default 'project' check (kind in ('project','klus')),
  description text not null default '',
  need jsonb not null default '{}'::jsonb,           -- {"1":5,"2":5} = benodigd aantal per weekdag
  created_at timestamptz not null default now()
);

-- Planningsregels: meerdere per medewerker per dag
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists assignments_date_idx on public.assignments (work_date);
create index if not exists assignments_employee_idx on public.assignments (employee_id, work_date);

-- Afwezigheid
create table if not exists public.absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type text not null check (type in ('Vakantie','Verlof','Ziekte','Overig')),
  from_date date not null,
  to_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);
create index if not exists absences_employee_idx on public.absences (employee_id, from_date);

-- Beveiliging: alleen ingelogde gebruikers hebben toegang, anonieme bezoekers niets.
alter table public.employees   enable row level security;
alter table public.projects    enable row level security;
alter table public.assignments enable row level security;
alter table public.absences    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['employees','projects','assignments','absences'] loop
    execute format('drop policy if exists "ingelogd: alles" on public.%I', t);
    execute format(
      'create policy "ingelogd: alles" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime: wijzigingen van collega's direct zichtbaar
do $$
declare t text;
begin
  foreach t in array array['employees','projects','assignments','absences'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
