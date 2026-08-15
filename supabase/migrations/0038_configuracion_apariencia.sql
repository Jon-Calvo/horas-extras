-- ============================================================================
-- 0038 · Configuración visual — tabla + Storage + RLS
-- ----------------------------------------------------------------------------
-- Ver README-CONFIG-VISUAL-FASE-A.md para el análisis completo. Resumen de
-- decisiones tomadas (Alternativa 1 del punto 2: colores de marca
-- configurables, colores estructurales resueltos por el sistema según
-- claro/oscuro — no editables uno por uno para evitar combinaciones sin
-- contraste):
--   - Tabla nueva (no se reusa configuracion_general: distinta responsabilidad).
--   - RLS: SELECT abierto a anon + authenticated (el login necesita leerla
--     sin sesión — primera tabla del proyecto con esta excepción, deliberada).
--   - Escritura: fn_es_admin(), mismo patrón que toda tabla maestra.
--   - Auditoría: reusa fn_registrar_auditoria() (0009), sin nada nuevo.
--   - Storage: bucket 'branding', público de lectura, escritura solo admin.
-- ============================================================================

-- ---------- Tipo de tema ----------------------------------------------------
create type tema_app as enum ('CLARO', 'OSCURO', 'SISTEMA');

-- ---------- Domain reusable para validar HEX en las 7 columnas de color ----
create domain hex_color as text check (value ~ '^#[0-9A-Fa-f]{6}$');

-- ---------- Tabla singleton (mismo patrón que configuracion_general) -------
create table configuracion_apariencia (
  id                     smallint primary key default 1 check (id = 1),
  nombre_empresa         text not null default 'Horas Extras',
  tema_predeterminado    tema_app not null default 'SISTEMA',
  color_primario         hex_color not null default '#2563EB',
  color_primario_hover   hex_color not null default '#1D4ED8',
  color_secundario       hex_color not null default '#64748B',
  color_acento           hex_color not null default '#7C3AED',
  color_exito            hex_color not null default '#16A34A',
  color_advertencia      hex_color not null default '#D97706',
  color_error            hex_color not null default '#DC2626',
  logo_bucket            text,
  logo_path              text,
  logo_actualizado_en    timestamptz,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references usuarios(id)
);

insert into configuracion_apariencia (id) values (1);

alter table configuracion_apariencia enable row level security;

-- Excepción deliberada: incluye 'anon' además de 'authenticated' — el login
-- (sin sesión) necesita leer nombre de empresa/logo/colores.
create policy configuracion_apariencia_select on configuracion_apariencia
  for select to anon, authenticated using (true);

create policy configuracion_apariencia_write on configuracion_apariencia
  for all to authenticated using (fn_es_admin()) with check (fn_es_admin());

create trigger trg_updated_at_configuracion_apariencia
  before update on configuracion_apariencia
  for each row execute function fn_set_updated_at();

create trigger trg_auditoria_configuracion_apariencia
  after update on configuracion_apariencia
  for each row execute function fn_registrar_auditoria();

-- ---------- Storage: bucket de branding -------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,  -- lectura pública (ver justificación en el análisis)
  5242880,  -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy branding_select on storage.objects
  for select using (bucket_id = 'branding');

create policy branding_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and fn_es_admin());

create policy branding_update on storage.objects
  for update to authenticated using (bucket_id = 'branding' and fn_es_admin());

create policy branding_delete on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and fn_es_admin());

-- ============================================================================
-- Cómo probar:
--   select * from configuracion_apariencia;  -- debe existir 1 fila con los defaults
--   update configuracion_apariencia set color_primario = 'no-es-un-hex' where id=1;
--   → debe fallar por el domain hex_color
--   select * from auditoria where tabla='configuracion_apariencia' order by fecha desc limit 1;
--   → después de un update válido, debe aparecer la fila de auditoría
--
--   -- Storage (desde el dashboard, Storage → branding, debería existir y
--   -- estar marcado como público):
--   select * from storage.buckets where id='branding';
-- ============================================================================
