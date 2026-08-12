-- ============================================================================
-- 0035 · Vista de resumen de empleados (para /admin/empleados)
-- ----------------------------------------------------------------------------
-- Mismo criterio que vista_solicitudes_resumen / vista_solicitud_empleados_detalle
-- (0019/0020): security_invoker=true para respetar RLS (acá la de
-- `empleados`, que depende del scope de visibilidad del usuario).
-- ============================================================================

create view vista_empleados_resumen
with (security_invoker = true)
as
select
  e.id,
  e.legajo,
  e.nombre_completo,
  ct.codigo as categoria_codigo,
  e.area_id,
  a.nombre as area_nombre,
  e.sector_id,
  sec.nombre as sector_nombre,
  e.proceso_id,
  proc.nombre as proceso_nombre,
  e.estado,
  e.ranking_horas,
  ib.descripcion as ib_descripcion,
  e.fecha_alta,
  e.fecha_baja
from empleados e
join categoria_tipos ct on ct.id = e.categoria_id
left join areas a on a.id = e.area_id
left join sectores sec on sec.id = e.sector_id
left join procesos proc on proc.id = e.proceso_id
left join ib_configuracion ib on ib.id = e.ib_id;

-- ============================================================================
-- Cómo probar:
--   select legajo, nombre_completo, categoria_codigo, area_nombre, ranking_horas
--     from vista_empleados_resumen order by nombre_completo;
-- ============================================================================
