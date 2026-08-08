-- ============================================================================
-- 0026 · FIX crítico: autoaprobación no sincronizaba el estado de la solicitud
-- ----------------------------------------------------------------------------
-- Diagnóstico (confirmado): el trigger BEFORE INSERT de 0015 dejaba la fila
-- con estado_aprobacion = 'APROBADO' ANTES de insertarla (para motivos con
-- requiere_aprobacion = false). El trigger AFTER INSERT llamaba después a
-- fn_marcar_empleado_aprobado(new.id, ...), que arranca con:
--     if v_se.estado_aprobacion = 'APROBADO' then return; end if;
-- Ese guard —pensado para no duplicar ranking si algo llama dos veces a la
-- misma aprobación— se disparaba INMEDIATAMENTE porque la fila YA estaba en
-- 'APROBADO' (recién insertada así por el before-insert). Consecuencia:
--   - nunca se sumaba ranking_horas al empleado
--   - nunca se auditaba el APPROVE
--   - lo más grave: nunca se llamaba a fn_sincronizar_estado_solicitud
-- Resultado: una solicitud con motivo sin aprobación, con un empleado
-- agregado, quedaba "atascada" en PENDIENTE en vez de pasar a CERRADA.
--
-- Fix: el BEFORE INSERT deja de decidir el estado_aprobacion — solo congela
-- el snapshot de ranking/IB (eso siempre estuvo bien). La decisión de
-- autoaprobar se mueve al AFTER INSERT, llamando a fn_marcar_empleado_aprobado
-- sobre una fila que en ese momento SIGUE en PENDIENTE_APROBACION (el
-- default de la columna) — así el guard de idempotencia no se dispara y la
-- función corre su lógica completa una sola vez, de punta a punta.
-- ============================================================================

-- ---------- BEFORE INSERT: SOLO snapshot, ya no decide estado_aprobacion --
create or replace function fn_solicitud_empleados_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empleado empleados;
begin
  select * into v_empleado from empleados where id = new.empleado_id;

  new.ranking_horas_al_momento := v_empleado.ranking_horas;
  new.ib_al_momento := v_empleado.ib_id;

  -- estado_aprobacion queda en su default (PENDIENTE_APROBACION); la
  -- autoaprobación (si corresponde) la resuelve el AFTER INSERT.
  return new;
end;
$$;

-- ---------- AFTER INSERT: calcula detalle y decide si autoaprueba ----------
create or replace function fn_solicitud_empleados_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requiere_aprobacion boolean;
begin
  perform fn_calcular_detalle_solicitud_empleado(new.id);

  select m.requiere_aprobacion into v_requiere_aprobacion
  from solicitudes s
  join motivos m on m.id = s.motivo_id
  where s.id = new.solicitud_id;

  if v_requiere_aprobacion is false then
    -- acá la fila todavía está en PENDIENTE_APROBACION (default de la
    -- columna) — fn_marcar_empleado_aprobado corre completo: suma ranking,
    -- audita APPROVE/SISTEMA, y sincroniza el estado de la solicitud.
    perform fn_marcar_empleado_aprobado(new.id, null);
  else
    perform fn_sincronizar_estado_solicitud(new.solicitud_id);
  end if;

  return new;
end;
$$;

-- ============================================================================
-- Cómo probar (el caso que reportaron):
--   1. Crear una solicitud con un motivo con requiere_aprobacion = false.
--   2. Agregar un empleado (rpc_agregar_empleado).
--   3. select estado_solicitud from solicitudes where id = '<id>';
--      → debe ser 'CERRADA' (antes del fix quedaba en 'PENDIENTE').
--   4. select estado_aprobacion, usuario_aprobacion_id from solicitud_empleados where id='<se_id>';
--      → 'APROBADO', usuario_aprobacion_id IS NULL.
--   5. select ranking_horas from empleados where id = '<empleado_id>';
--      → debe haber subido en el total_horas de esa solicitud (antes del fix no subía).
--   6. select accion, origen from auditoria where tabla='solicitud_empleados' and registro_id='<se_id>' order by fecha;
--      → debe haber una fila INSERT/USUARIO (genérica) Y una fila APPROVE/SISTEMA
--        (antes del fix, la fila APPROVE nunca se generaba).
-- ============================================================================
