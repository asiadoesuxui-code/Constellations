create table constellations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wish text not null,
  seed bigint not null,
  x double precision not null,
  y double precision not null,
  colour_palette text
);

create index constellations_xy_idx on constellations (x, y);

alter table constellations enable row level security;

create policy "public select" on constellations
  for select using (true);

create policy "public insert" on constellations
  for insert with check (true);

alter publication supabase_realtime add table constellations;
