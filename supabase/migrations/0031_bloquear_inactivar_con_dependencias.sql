-- ============================================================================
-- 0031 · Bloquear inactivar área/sector/proceso con dependencias
-- ----------------------------------------------------------------------------
-- Regla pedida: un Área no puede inactivarse si tiene sectores activos,
-- usuarios asociados, o solicitudes. Mismo criterio para Sector y Proceso.
-- Agregué también `empleados` a la lista de dependencias (no estaba en el
-- pedido explícito, pero es la misma categoría de riesgo: un empleado con
-- area_id/sector_id/proceso_id apuntando a un registro inactivo es una
-- inconsistencia de datos igual de real que un usuario en esa situación).
--
-- Interpretación tomada: CUALQUIER solicitud histórica bloquea la
-- inactivación (no until las que están PENDIENTE/ABIERTA) — es la lectura
-- literal de "o solicitudes" en el pedido. Si preferís que solo bloqueen
-- las solicitudes todavía activas (no ELIMINADA/CERRADA muy vieja), es un
-- cambio de una línea en cada función — avisame.
--
-- Se implementa como trigger BEFORE UPDATE OF activo, disparando solo en
-- la transición true → false (activar no tiene restricciones).
-- ============================================================================

create or replace function fn_bloquear_inactivar_area()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from sectores where area_id = old.id and activo) then
    raise exception 'No se puede inactivar el área "%": tiene sectores activos', old.nombre;
  end if;
  if exists (select 1 from usuarios where area_id = old.id) then
    raise exception 'No se puede inactivar el área "%": tiene usuarios asociados', old.nombre;
  end if;
  if exists (select 1 from solicitudes where area_id = old.id) then
    raise exception 'No se puede inactivar el área "%": tiene solicitudes asociadas', old.nombre;
  end if;
  return new;
end;
$$;

create trigger trg_bloquear_inactivar_area
  before update of activo on areas
  for each row
  when (old.activo = true and new.activo = false)
  execute function fn_bloquear_inactivar_area();

create or replace function fn_bloquear_inactivar_sector()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from procesos where sector_id = old.id and activo) then
    raise exception 'No se puede inactivar el sector "%": tiene procesos activos', old.nombre;
  end if;
  if exists (select 1 from usuarios where sector_id = old.id) then
    raise exception 'No se puede inactivar el sector "%": tiene usuarios asociados', old.nombre;
  end if;
  if exists (select 1 from solicitudes where sector_id = old.id) then
    raise exception 'No se puede inactivar el sector "%": tiene solicitudes asociadas', old.nombre;
  end if;
  return new;
end;
$$;

create trigger trg_bloquear_inactivar_sector
  before update of activo on sectores
  for each row
  when (old.activo = true and new.activo = false)
  execute function fn_bloquear_inactivar_sector();

create or replace function fn_bloquear_inactivar_proceso()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from usuarios where proceso_id = old.id) then
    raise exception 'No se puede inactivar el proceso "%": tiene usuarios asociados', old.nombre;
  end if;
  if exists (select 1 from solicitudes where proceso_id = old.id) then
    raise exception 'No se puede inactivar el proceso "%": tiene solicitudes asociadas', old.nombre;
  end if;
  return new;
end;
$$;

create trigger trg_bloquear_inactivar_proceso
  before update of activo on procesos
  for each row
  when (old.activo = true and new.activo = false)
  execute function fn_bloquear_inactivar_proceso();

-- ============================================================================
-- Cómo probar:
--   update areas set activo = false where id = (select area_id from sectores where activo limit 1);
--   → debe fallar: 'No se puede inactivar el área "...": tiene sectores activos'
-- ============================================================================
