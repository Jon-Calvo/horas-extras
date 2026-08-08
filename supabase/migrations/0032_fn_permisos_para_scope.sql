-- ============================================================================
-- 0032 · fn_permisos_para_scope — conveniencia para el frontend, NO
-- reemplaza a fn_puede_ver/modificar/aprobar/reabrir/control_ingreso
-- ----------------------------------------------------------------------------
-- Las funciones individuales SIGUEN siendo necesarias tal cual están: cada
-- policy de RLS llama a UNA específica (using (fn_puede_ver(...))), y
-- consolidarlas ahí adentro haría que cada evaluación de fila calculara
-- los 5 permisos para usar 1 solo — más trabajo, no menos.
-- Esta función es solo para pantallas como [id]/page.tsx, que hoy hacen 4
-- llamadas RPC en paralelo para preguntar los 4 permisos de esa vista — acá
-- se resuelve en 1 sola request.
-- ============================================================================

create or replace function fn_permisos_para_scope(p_area_id uuid, p_sector_id uuid, p_proceso_id uuid)
returns table (
  puede_ver boolean,
  puede_modificar boolean,
  puede_aprobar boolean,
  puede_reabrir boolean,
  puede_control_ingreso boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fn_puede_ver(p_area_id, p_sector_id, p_proceso_id),
    fn_puede_modificar(p_area_id, p_sector_id, p_proceso_id),
    fn_puede_aprobar(p_area_id, p_sector_id, p_proceso_id),
    fn_puede_reabrir(p_area_id, p_sector_id, p_proceso_id),
    fn_puede_control_ingreso();
$$;

-- ============================================================================
-- Cómo probar:
--   select * from fn_permisos_para_scope('<area>', '<sector>', '<proceso>');
--   → una sola fila con las 5 columnas booleanas.
-- ============================================================================
