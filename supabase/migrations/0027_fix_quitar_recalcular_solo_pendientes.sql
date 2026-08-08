-- ============================================================================
-- 0027 · FIX de coherencia: quitar/recalcular solo aplica a empleados
-- todavía PENDIENTE_APROBACION
-- ----------------------------------------------------------------------------
-- Dos huecos encontrados en la auditoría:
--
-- 1) rpc_quitar_empleado solo validaba el estado de la SOLICITUD
--    (PENDIENTE/ABIERTA), no el estado del EMPLEADO dentro de ella. Una
--    solicitud ABIERTA puede tener mezcla de empleados ya APROBADO/
--    RECHAZADO junto con otros PENDIENTE_APROBACION — con la validación
--    vieja, se podía borrar un empleado ya APROBADO (que ya había sumado
--    ranking_horas) sin revertir ese ranking. rpc_eliminar_solicitud y
--    rpc_reabrir_solicitud sí revierten ranking al tocar aprobados; quitar
--    un empleado individual no lo hacía — inconsistente.
--
-- 2) rpc_recalcular_empleado no validaba estado_aprobacion en absoluto.
--    Si se recalculaba un empleado ya APROBADO (por ejemplo porque cambió
--    una banda horaria o el valor de una categoría), total_horas podía
--    cambiar sin que el ranking_horas ya sumado al empleado se ajustara —
--    quedaba desincronizado con el nuevo total.
--
-- Fix: ambas operaciones ahora exigen estado_aprobacion = 'PENDIENTE_APROBACION'.
-- Coincide con el enunciado original ("MODIFICACIÓN: Solo solicitudes
-- PENDIENTES: agregar empleados, quitar empleados, recalcular horas") —
-- una vez que un empleado fue decidido (aprobado o rechazado), ya no es una
-- modificación de carga, es parte del historial de la aprobación.
-- ============================================================================

create or replace function rpc_quitar_empleado(p_solicitud_empleado_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_se solicitud_empleados;
  v_solicitud solicitudes;
begin
  select * into v_se from solicitud_empleados where id = p_solicitud_empleado_id;
  if v_se.id is null then
    raise exception 'El registro no existe';
  end if;
  if v_se.estado_aprobacion <> 'PENDIENTE_APROBACION' then
    raise exception 'Solo se pueden quitar empleados que todavía están PENDIENTE_APROBACION (este ya fue %)', v_se.estado_aprobacion;
  end if;

  select * into v_solicitud from solicitudes where id = v_se.solicitud_id;
  if v_solicitud.estado_solicitud not in ('PENDIENTE','ABIERTA') then
    raise exception 'Solo se pueden quitar empleados mientras la solicitud está PENDIENTE o ABIERTA';
  end if;
  if not fn_puede_modificar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para modificar esta solicitud';
  end if;

  delete from solicitud_empleados where id = p_solicitud_empleado_id;  -- trigger de 0015 resincroniza el estado
end;
$$;

create or replace function rpc_recalcular_empleado(p_solicitud_empleado_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_se solicitud_empleados;
  v_solicitud solicitudes;
begin
  select * into v_se from solicitud_empleados where id = p_solicitud_empleado_id;
  if v_se.id is null then
    raise exception 'El registro no existe';
  end if;
  if v_se.estado_aprobacion <> 'PENDIENTE_APROBACION' then
    raise exception 'Solo se puede recalcular un empleado que todavía está PENDIENTE_APROBACION (este ya fue %)', v_se.estado_aprobacion;
  end if;

  select * into v_solicitud from solicitudes where id = v_se.solicitud_id;
  if v_solicitud.estado_solicitud not in ('PENDIENTE','ABIERTA') then
    raise exception 'No se puede recalcular: la solicitud no está PENDIENTE ni ABIERTA (estado actual: %)', v_solicitud.estado_solicitud;
  end if;
  if not fn_puede_modificar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para modificar esta solicitud';
  end if;

  perform fn_calcular_detalle_solicitud_empleado(p_solicitud_empleado_id);
end;
$$;

-- ============================================================================
-- Cómo probar:
--   1. Aprobar un empleado (rpc_aprobar_empleado).
--   2. rpc_quitar_empleado(ese_id) → debe fallar: "ya fue APROBADO".
--   3. rpc_recalcular_empleado(ese_id) → debe fallar: "ya fue APROBADO".
--   4. Sobre un empleado todavía PENDIENTE_APROBACION, ambos deben funcionar
--      igual que antes.
-- ============================================================================
