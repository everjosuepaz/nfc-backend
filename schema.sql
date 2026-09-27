-- =========================================================
-- ESQUEMA: Souvenirs NFC
-- Ejecuta esto completo en el SQL Editor de Supabase
-- =========================================================

-- Tabla principal: un souvenir = un chip NFC = un ID único
create table if not exists souvenirs (
  id           text primary key,                -- ej. 'PARIS-00001', viene de la URL del chip
  status       text not null default 'pending'
               check (status in ('pending', 'active')),
  user_id      uuid,                             -- opcional: si luego agregas auth de clientes
  title        text,
  travel_date  date,
  description  text,
  created_at   timestamptz not null default now()
);

-- Fotos asociadas a cada souvenir
create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  souvenir_id   text not null references souvenirs(id) on delete cascade,
  storage_path  text not null,                   -- ruta dentro del bucket, no la URL completa
  created_at    timestamptz not null default now()
);

create index if not exists idx_photos_souvenir_id on photos(souvenir_id);

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- El backend usa la SERVICE_ROLE key, que IGNORA RLS por
-- diseño de Supabase (es la llave de administrador).
-- Estas políticas solo importan si en el futuro expones
-- estas tablas directo al navegador con la 'anon key'.
-- =========================================================
alter table souvenirs enable row level security;
alter table photos    enable row level security;

-- Lectura pública SOLO de souvenirs ya activados (nunca de 'pending',
-- para no exponer IDs de chips que aún nadie ha activado)
create policy "public_read_active_souvenirs"
  on souvenirs for select
  using (status = 'active');

-- Lectura pública de fotos, solo si su souvenir está activo
create policy "public_read_photos_of_active_souvenirs"
  on photos for select
  using (
    exists (
      select 1 from souvenirs s
      where s.id = photos.souvenir_id and s.status = 'active'
    )
  );

-- No se crean policies de INSERT/UPDATE para 'anon':
-- todas las escrituras pasan por tu backend con la service_role key.

-- =========================================================
-- STORAGE: bucket de fotos
-- =========================================================
insert into storage.buckets (id, name, public)
values ('souvenir-photos', 'souvenir-photos', true)
on conflict (id) do nothing;

-- Lectura pública de las fotos (bucket público = URLs directas sin firmar)
create policy "public_read_souvenir_photos"
  on storage.objects for select
  using (bucket_id = 'souvenir-photos');

-- No hace falta policy de insert en storage.objects para 'anon':
-- el backend sube los archivos con la service_role key, que también
-- ignora estas políticas.
