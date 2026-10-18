-- Planificateur de vacances : tables, relations et règles de sécurité
-- À exécuter une fois dans le SQL Editor de Supabase, sur un projet vierge.

-- Voyages
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  origin text not null default '' check (char_length(origin) <= 100),
  destination text not null check (char_length(destination) between 2 and 100),
  start_date date not null,
  end_date date not null,
  budget integer not null check (budget between 1 and 100000),
  travelers integer not null check (travelers between 1 and 20),
  preferences text not null default '' check (char_length(preferences) <= 1000),
  summary text,
  transport_estimate integer check (transport_estimate >= 0),
  lodging_estimate integer check (lodging_estimate >= 0),
  budget_advice text check (char_length(budget_advice) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  error_message text,
  created_at timestamptz not null default now(),
  constraint dates_ordonnees check (end_date >= start_date),
  constraint duree_max_14_jours check (end_date - start_date <= 13)
);

create index trips_user_id_idx on public.trips (user_id, created_at desc);

-- Jours de l'itinéraire
create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number integer not null check (day_number between 1 and 14),
  date date not null,
  morning text not null,
  afternoon text not null,
  evening text not null,
  estimated_budget integer not null check (estimated_budget >= 0),
  unique (trip_id, day_number)
);

create index trip_days_trip_id_idx on public.trip_days (trip_id);

-- Liste de bagages
create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  category text not null check (char_length(category) between 1 and 50),
  checked boolean not null default false
);

create index packing_items_trip_id_idx on public.packing_items (trip_id);

-- Row Level Security : chaque utilisateur ne voit que ses données
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.packing_items enable row level security;

-- trips : lecture, création (en attente et sans résultat uniquement) et suppression de ses voyages
create policy "trips_select_own" on public.trips
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "trips_insert_own" on public.trips
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and summary is null
    and error_message is null
    and transport_estimate is null
    and lodging_estimate is null
    and budget_advice is null
  );

create policy "trips_delete_own" on public.trips
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- trip_days : lecture seule (écrits par le worker avec la clé secrète)
create policy "trip_days_select_own" on public.trip_days
  for select to authenticated
  using (user_id = (select auth.uid()));

-- packing_items : lecture, et modification de la seule colonne « checked »
create policy "packing_items_select_own" on public.packing_items
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "packing_items_update_own" on public.packing_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke update on public.packing_items from authenticated;
grant update (checked) on public.packing_items to authenticated;

-- Realtime : la page détail est prévenue quand le voyage change de statut
alter publication supabase_realtime add table public.trips;
