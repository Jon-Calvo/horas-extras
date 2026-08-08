-- ============================================================================
-- 0024 · Vista de listado: proceso ya no es opcional
-- ----------------------------------------------------------------------------
-- 0019 armó `vista_solicitudes_resumen` con `left join procesos` porque en
-- ese momento `solicitudes.proceso_id` era nullable. Desde 0022 es NOT NULL,
-- así que corresponde `inner join` — más preciso semánticamente y evita que
-- el tipo generado por Supabase para `proceso_nombre` siga marcándose como
-- nullable cuando en la práctica nunca lo es.
-- ============================================================================

create or replace view vista_solicitudes_resumen
with (security_invoker = true)
as
select
  s.id,
  s.numero,
  s.estado_solicitud,
  s.solicitante_id,
  u.nombre_completo as solicitante_nombre,
  s.area_id,
  a.nombre as area_nombre,
  s.sector_id,
  sec.nombre as sector_nombre,
  s.proceso_id,
  proc.nombre as proceso_nombre,
  s.motivo_id,
  m.motivo as motivo_nombre,
  m.tipo as motivo_tipo,
  s.fecha_hora_inicio,
  s.fecha_hora_fin,
  s.observacion,
  s.moneda,
  s.fecha_hora_solicitud,
  count(se.id) as cantidad_empleados,
  coalesce(sum(se.total_horas), 0) as total_horas_solicitud,
  coalesce(sum(se.total_importe), 0) as total_importe_solicitud
from solicitudes s
join usuarios u on u.id = s.solicitante_id
join areas a on a.id = s.area_id
join sectores sec on sec.id = s.sector_id
join procesos proc on proc.id = s.proceso_id   -- antes: left join
join motivos m on m.id = s.motivo_id
left join solicitud_empleados se on se.solicitud_id = s.id
group by
  s.id, u.nombre_completo, a.nombre, sec.nombre, proc.nombre, m.motivo, m.tipo;

-- ============================================================================
-- Cómo probar: cualquier solicitud existente debe seguir apareciendo (todas
-- ya tienen proceso_id por la NOT NULL de 0022, así que el inner join no
-- pierde filas).
--   select numero, proceso_nombre from vista_solicitudes_resumen limit 5;
-- ============================================================================
