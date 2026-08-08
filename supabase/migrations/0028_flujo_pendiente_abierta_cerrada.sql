-- ============================================================================
-- 0028 · Fase 5.2 — Nuevo flujo de solicitudes: PENDIENTE (borrador) →
-- ABIERTA (finalizada, en aprobación) → CERRADA
-- ----------------------------------------------------------------------------
-- Resumen del cambio de reglas:
--   PENDIENTE = borrador. Se pueden agregar/quitar/recalcular empleados y
--     editar la solicitud. NUNCA sale de acá sola — solo por
--     rpc_finalizar_carga (acción explícita del solicitante).
--   ABIERTA = carga finalizada. Ya no se agregan/quitan/recalculan
--     empleados. Se aprueba/rechaza (individual o masivo). Cuando no queda
--     ningún PENDIENTE_APROBACION, pasa sola a CERRADA.
--   ABIERTA → PENDIENTE ("volver a borrador"): acción explícita, mismo
--     permiso que reabrir (reapertura_nivel), bloqueada si hay control de
--     ingreso registrado. NO resetea decisiones ya tomadas — solo desbloquea
--     la edición del equipo otra vez.
--   CERRADA → ABIERTA (rpc_reabrir_solicitud): SIN CAMBIOS, sigue
--     reseteando TODOS los empleados a PENDIENTE_APROBACION (comportamiento
--     ya existente, "mantener reapertura").
--
-- Consecuencia que había que resolver: con motivos sin aprobación, un
-- empleado puede quedar APROBADO (autoaprobación) mientras la solicitud
-- SIGUE en PENDIENTE. Eso significa que quitar/recalcular ese empleado
-- durante el borrador tiene que ajustar ranking_horas — antes no hacía
-- falta porque nunca convivían "PENDIENTE" + "empleado ya aprobado".
-- ============================================================================

-- ---------- (1) fn_sincronizar_estado_solicitud: solo ABIERTA se autoevalúa
create or replace function fn_sincronizar_estado_solicitud(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_actual estado_solicitud;
  v_pendientes integer;
begin
  select estado_solicitud into v_estado_actual from solicitudes where id = p_solicitud_id;

  -- PENDIENTE es borrador: solo sale por rpc_finalizar_carga (explícito).
  -- CERRADA/ELIMINADA no se tocan automáticamente (reabrir/volver_a_pendiente
  -- son siempre explícitas). Únicamente ABIERTA se reevalúa acá.
  if v_estado_actual is distinct from 'ABIERTA' then
    return;
  end if;

  select count(*) filter (where estado_aprobacion = 'PENDIENTE_APROBACION')
    into v_pendientes
    from solicitud_empleados
    where solicitud_id = p_solicitud_id;

  if v_pendientes = 0 then
    update solicitudes set estado_solicitud = 'CERRADA'::estado_solicitud where id = p_solicitud_id;
  end if;
end;
$$;

-- ---------- (2) Agregar empleado: solo mientras PENDIENTE (antes: PENDIENTE o ABIERTA)
create or replace function fn_agregar_empleado_interno(p_solicitud_id uuid, p_empleado_id uuid)
returns solicitud_empleados
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
  v_empleado  empleados;
  v_moneda_nueva text;
  v_se solicitud_empleados;
begin
  select * into v_solicitud from solicitudes where id = p_solicitud_id;
  if v_solicitud.id is null then
    raise exception 'La solicitud no existe';
  end if;
  if v_solicitud.estado_solicitud <> 'PENDIENTE' then
    raise exception 'Solo se pueden agregar empleados mientras la solicitud está PENDIENTE (borrador) — si ya finalizó la carga, usá "Volver a borrador"';
  end if;
  if not fn_puede_modificar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para modificar esta solicitud';
  end if;

  select * into v_empleado from empleados where id = p_empleado_id;
  if v_empleado.id is null or v_empleado.estado <> 'ACTIVO' then
    raise exception 'El empleado no existe o no está ACTIVO';
  end if;

  if exists (select 1 from solicitud_empleados where solicitud_id = p_solicitud_id and empleado_id = p_empleado_id) then
    raise exception 'El empleado ya está en el equipo de esta solicitud';
  end if;

  if exists (
    select 1
    from solicitud_empleados se
    join solicitudes s on s.id = se.solicitud_id
    where se.empleado_id = p_empleado_id
      and se.estado_aprobacion <> 'RECHAZADO'
      and s.estado_solicitud <> 'ELIMINADA'
      and s.id <> p_solicitud_id
      and (s.fecha_hora_inicio, s.fecha_hora_fin) overlaps (v_solicitud.fecha_hora_inicio, v_solicitud.fecha_hora_fin)
  ) then
    raise exception 'El empleado ya tiene horas asignadas que se superponen con este horario en otra solicitud';
  end if;

  select cv.moneda into v_moneda_nueva
    from fn_valor_hora_vigente(v_empleado.categoria_id, v_solicitud.fecha_hora_inicio::date) cv;

  if v_solicitud.moneda is null then
    update solicitudes set moneda = v_moneda_nueva where id = p_solicitud_id;
  elsif v_solicitud.moneda <> v_moneda_nueva then
    raise exception 'No se puede mezclar monedas en la misma solicitud (solicitud en %, empleado en %)', v_solicitud.moneda, v_moneda_nueva;
  end if;

  insert into solicitud_empleados (solicitud_id, empleado_id)
  values (p_solicitud_id, p_empleado_id)
  returning * into v_se;

  return v_se;
end;
$$;

-- ---------- (3) Quitar empleado: solo PENDIENTE, revierte ranking si ya autoaprobó
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

  select * into v_solicitud from solicitudes where id = v_se.solicitud_id;
  if v_solicitud.id is null or v_solicitud.estado_solicitud <> 'PENDIENTE' then
    raise exception 'Solo se pueden quitar empleados mientras la solicitud está PENDIENTE (borrador)';
  end if;
  if not fn_puede_modificar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para modificar esta solicitud';
  end if;

  -- Si el empleado ya está APROBADO, solo puede ser por autoaprobación (la
  -- aprobación manual está bloqueada mientras la solicitud es PENDIENTE) —
  -- hay que revertir el ranking que ya se le sumó, si no queda inflado.
  if v_se.estado_aprobacion = 'APROBADO' then
    update empleados set ranking_horas = greatest(0, ranking_horas - v_se.total_horas) where id = v_se.empleado_id;
  end if;

  delete from solicitud_empleados where id = p_solicitud_empleado_id;  -- trigger de 0015 resincroniza (no-op en PENDIENTE)
end;
$$;

-- ---------- (4) Recalcular empleado: solo PENDIENTE, ajusta ranking por la diferencia
create or replace function rpc_recalcular_empleado(p_solicitud_empleado_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_se solicitud_empleados;
  v_solicitud solicitudes;
  v_horas_antes numeric(12,4);
  v_horas_despues numeric(12,4);
begin
  select * into v_se from solicitud_empleados where id = p_solicitud_empleado_id;
  if v_se.id is null then
    raise exception 'El registro no existe';
  end if;

  select * into v_solicitud from solicitudes where id = v_se.solicitud_id;
  if v_solicitud.id is null or v_solicitud.estado_solicitud <> 'PENDIENTE' then
    raise exception 'Solo se puede recalcular mientras la solicitud está PENDIENTE (borrador)';
  end if;
  if not fn_puede_modificar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para modificar esta solicitud';
  end if;

  v_horas_antes := v_se.total_horas;

  perform fn_calcular_detalle_solicitud_empleado(p_solicitud_empleado_id);

  select total_horas into v_horas_despues from solicitud_empleados where id = p_solicitud_empleado_id;

  -- Si estaba autoaprobado, el ranking ya sumado corresponde a las horas
  -- VIEJAS — se ajusta por la diferencia, no se vuelve a sumar entero.
  if v_se.estado_aprobacion = 'APROBADO' and v_horas_despues is distinct from v_horas_antes then
    update empleados
      set ranking_horas = greatest(0, ranking_horas + (v_horas_despues - v_horas_antes))
      where id = v_se.empleado_id;
  end if;
end;
$$;

-- ---------- (5) Aprobar/rechazar: ahora exclusivamente en ABIERTA (antes: PENDIENTE o ABIERTA)
create or replace function rpc_aprobar_empleado(p_solicitud_empleado_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
begin
  select s.* into v_solicitud from solicitud_empleados se join solicitudes s on s.id = se.solicitud_id
    where se.id = p_solicitud_empleado_id;
  if v_solicitud.id is null then raise exception 'El registro no existe'; end if;
  if v_solicitud.estado_solicitud <> 'ABIERTA' then
    raise exception 'Solo se puede aprobar mientras la solicitud está ABIERTA (finalizada)';
  end if;
  if not fn_puede_aprobar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para aprobar en ese área/sector/proceso';
  end if;

  perform fn_marcar_empleado_aprobado(p_solicitud_empleado_id, auth.uid());
end;
$$;

create or replace function rpc_rechazar_empleado(p_solicitud_empleado_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
begin
  select s.* into v_solicitud from solicitud_empleados se join solicitudes s on s.id = se.solicitud_id
    where se.id = p_solicitud_empleado_id;
  if v_solicitud.id is null then raise exception 'El registro no existe'; end if;
  if v_solicitud.estado_solicitud <> 'ABIERTA' then
    raise exception 'Solo se puede rechazar mientras la solicitud está ABIERTA (finalizada)';
  end if;
  if not fn_puede_aprobar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para aprobar/rechazar en ese área/sector/proceso';
  end if;

  perform fn_marcar_empleado_rechazado(p_solicitud_empleado_id, auth.uid());
end;
$$;

create or replace function rpc_aprobar_solicitud_completa(p_solicitud_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
  v_se record;
begin
  select * into v_solicitud from solicitudes where id = p_solicitud_id;
  if v_solicitud.id is null then raise exception 'La solicitud no existe'; end if;
  if v_solicitud.estado_solicitud <> 'ABIERTA' then
    raise exception 'Solo se puede aprobar mientras la solicitud está ABIERTA (finalizada)';
  end if;
  if not fn_puede_aprobar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para aprobar en ese área/sector/proceso';
  end if;

  for v_se in select id from solicitud_empleados where solicitud_id = p_solicitud_id and estado_aprobacion = 'PENDIENTE_APROBACION' loop
    perform fn_marcar_empleado_aprobado(v_se.id, auth.uid());
  end loop;
end;
$$;

create or replace function rpc_rechazar_solicitud_completa(p_solicitud_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
  v_se record;
begin
  select * into v_solicitud from solicitudes where id = p_solicitud_id;
  if v_solicitud.id is null then raise exception 'La solicitud no existe'; end if;
  if v_solicitud.estado_solicitud <> 'ABIERTA' then
    raise exception 'Solo se puede rechazar mientras la solicitud está ABIERTA (finalizada)';
  end if;
  if not fn_puede_aprobar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para aprobar/rechazar en ese área/sector/proceso';
  end if;

  for v_se in select id from solicitud_empleados where solicitud_id = p_solicitud_id and estado_aprobacion = 'PENDIENTE_APROBACION' loop
    perform fn_marcar_empleado_rechazado(v_se.id, auth.uid());
  end loop;
end;
$$;

-- ---------- (6) Nuevo: finalizar carga (PENDIENTE → ABIERTA o CERRADA) -----
create or replace function rpc_finalizar_carga(p_solicitud_id uuid)
returns solicitudes
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
  v_total integer;
  v_pendientes integer;
begin
  select * into v_solicitud from solicitudes where id = p_solicitud_id;
  if v_solicitud.id is null then
    raise exception 'La solicitud no existe';
  end if;
  if v_solicitud.estado_solicitud <> 'PENDIENTE' then
    raise exception 'Solo se puede finalizar la carga de una solicitud PENDIENTE (borrador)';
  end if;
  if not fn_puede_modificar(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para finalizar la carga de esta solicitud';
  end if;

  select count(*), count(*) filter (where estado_aprobacion = 'PENDIENTE_APROBACION')
    into v_total, v_pendientes
    from solicitud_empleados
    where solicitud_id = p_solicitud_id;

  if v_total = 0 then
    raise exception 'Agregá al menos un empleado antes de finalizar la carga';
  end if;

  update solicitudes
    set estado_solicitud = case when v_pendientes > 0 then 'ABIERTA'::estado_solicitud else 'CERRADA'::estado_solicitud end
    where id = p_solicitud_id
    returning * into v_solicitud;

  return v_solicitud;
end;
$$;

-- ---------- (7) Nuevo: volver a borrador (ABIERTA → PENDIENTE) -------------
-- Mismo permiso que reabrir (reapertura_nivel), mismo bloqueo por control de
-- ingreso. A diferencia de rpc_reabrir_solicitud, NO toca las decisiones ya
-- tomadas (solo desbloquea agregar/quitar/recalcular otra vez).
create or replace function rpc_volver_a_pendiente(p_solicitud_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_solicitud solicitudes;
begin
  select * into v_solicitud from solicitudes where id = p_solicitud_id;
  if v_solicitud.id is null then
    raise exception 'La solicitud no existe';
  end if;
  if v_solicitud.estado_solicitud <> 'ABIERTA' then
    raise exception 'Solo se puede volver a borrador desde el estado ABIERTA';
  end if;
  if not fn_puede_reabrir(v_solicitud.area_id, v_solicitud.sector_id, v_solicitud.proceso_id) then
    raise exception 'No tenés permiso para volver esta solicitud a borrador';
  end if;
  if exists (select 1 from solicitud_empleados where solicitud_id = p_solicitud_id and fecha_hora_ingreso is not null) then
    raise exception 'Hay control de ingreso registrado en esta solicitud: no se puede volver a borrador (eliminá el control de ingreso primero)';
  end if;

  update solicitudes set estado_solicitud = 'PENDIENTE' where id = p_solicitud_id;

  insert into auditoria (usuario_id, accion, tabla, registro_id, origen)
  values (auth.uid(), 'REOPEN', 'solicitudes', p_solicitud_id, 'USUARIO'::origen_auditoria);
end;
$$;

-- ============================================================================
-- Cómo probar el flujo completo (motivo QUE requiere aprobación):
--   1. rpc_crear_solicitud(...) → PENDIENTE
--   2. rpc_agregar_empleado(...) x2 → sigue PENDIENTE (antes se iba a ABIERTA)
--   3. rpc_finalizar_carga(...) → ABIERTA (quedan 2 pendientes)
--   4. rpc_agregar_empleado(...) → debe FALLAR ("volver a borrador" primero)
--   5. rpc_aprobar_empleado(empleado_1) → sigue ABIERTA (1 pendiente)
--   6. rpc_aprobar_empleado(empleado_2) → pasa sola a CERRADA
--
-- Motivo que NO requiere aprobación:
--   1. rpc_crear_solicitud(...) → PENDIENTE
--   2. rpc_agregar_empleado(...) → sigue PENDIENTE (autoaprobado, ranking sumado,
--      pero la solicitud NO se cierra sola — antes sí, ese era el bug reportado)
--   3. rpc_finalizar_carga(...) → CERRADA directo (no pasa por ABIERTA)
--
-- Volver a borrador:
--   1. Con la solicitud ABIERTA del primer ejemplo (antes de aprobar a nadie):
--      rpc_volver_a_pendiente(...) → PENDIENTE
--   2. rpc_agregar_empleado(empleado_3) → debe funcionar de nuevo
--   3. rpc_quitar_empleado(empleado_1_id) → debe funcionar (estaba PENDIENTE_APROBACION)
-- ============================================================================
