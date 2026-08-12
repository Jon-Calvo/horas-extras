-- ============================================================================
-- 0037 · Fase 7.3 — Eliminar/inactivar empleado (ADMIN), con la decisión
-- resuelta automáticamente según si tiene historial
-- ----------------------------------------------------------------------------
-- Ver README-FASE7-3-ANALISIS.md. Un solo punto de entrada
-- (rpc_eliminar_o_inactivar_empleado): si el empleado no tiene ninguna fila
-- en solicitud_empleados ni en ranking_horas_historico, DELETE físico; si
-- tiene, baja lógica (estado=INACTIVO) — que es lo único que las FK
-- existentes permiten de todos modos.
-- ============================================================================

create or replace function rpc_eliminar_o_inactivar_empleado(p_empleado_id uuid)
returns table (accion_realizada text, mensaje text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empleado empleados;
  v_tiene_historial boolean;
begin
  if not fn_es_admin() then
    raise exception 'Solo un administrador puede eliminar o inactivar empleados';
  end if;

  select * into v_empleado from empleados where id = p_empleado_id;
  if v_empleado.id is null then
    raise exception 'El empleado no existe';
  end if;

  v_tiene_historial := exists (select 1 from solicitud_empleados where empleado_id = p_empleado_id)
    or exists (select 1 from ranking_horas_historico where empleado_id = p_empleado_id);

  if v_tiene_historial then
    update empleados set estado = 'INACTIVO', fecha_baja = coalesce(fecha_baja, current_date) where id = p_empleado_id;
    accion_realizada := 'INACTIVADO';
    mensaje := format(
      'El empleado "%s" (legajo %s) tiene historial de solicitudes o ranking — se dio de baja lógica (INACTIVO) para preservar la trazabilidad. No se eliminó físicamente.',
      v_empleado.nombre_completo, v_empleado.legajo
    );
  else
    delete from empleados where id = p_empleado_id;
    accion_realizada := 'ELIMINADO';
    mensaje := format(
      'El empleado "%s" (legajo %s) no tenía historial asociado — se eliminó físicamente.',
      v_empleado.nombre_completo, v_empleado.legajo
    );
  end if;

  return next;
end;
$$;

-- Defensa en profundidad: policy explícita de DELETE restringida a admin.
-- Ya estaba bloqueado por omisión (RLS activo + sin policy de DELETE =
-- denegado por default), pero dejarlo explícito documenta la regla en el
-- propio esquema.
create policy empleados_delete on empleados for delete to authenticated using (fn_es_admin());

-- ============================================================================
-- Cómo probar:
--   -- empleado sin historial (ej: uno de prueba recién creado):
--   select * from rpc_eliminar_o_inactivar_empleado('<id_sin_historial>');
--   → accion_realizada = 'ELIMINADO'
--   select count(*) from empleados where id = '<id_sin_historial>'; → 0
--
--   -- empleado con historial (cualquiera que ya tenga solicitudes):
--   select * from rpc_eliminar_o_inactivar_empleado('<id_con_historial>');
--   → accion_realizada = 'INACTIVADO'
--   select estado from empleados where id = '<id_con_historial>'; → 'INACTIVO'
--
--   -- como no-admin (probar desde la app logueado con un usuario sin rol ADMIN):
--   select * from rpc_eliminar_o_inactivar_empleado('<cualquier_id>');
--   → debe fallar: 'Solo un administrador puede...'
-- ============================================================================
