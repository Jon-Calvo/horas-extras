-- ============================================================================
-- 0029 · RLS de solicitud_empleados: alinear con el nuevo flujo (0028)
-- ----------------------------------------------------------------------------
-- Las políticas de 0013 permitían insert/update/delete de solicitud_empleados
-- mientras la solicitud estuviera en PENDIENTE **o** ABIERTA. Con 0028, el
-- negocio ahora exige que agregar/quitar/recalcular solo pase en PENDIENTE.
-- Los RPC (SECURITY DEFINER) ya bloquean esto, pero las policies siguen
-- siendo la barrera real si alguien accede a la tabla directo con el SDK de
-- Supabase salteándose los RPC (defensa en profundidad, mismo criterio que
-- usamos con proceso_id NOT NULL en 0022).
-- ============================================================================

drop policy solicitud_empleados_insert on solicitud_empleados;
create policy solicitud_empleados_insert on solicitud_empleados for insert to authenticated
  with check (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_empleados.solicitud_id
        and s.estado_solicitud = 'PENDIENTE'
        and fn_puede_modificar(s.area_id, s.sector_id, s.proceso_id)
    )
  );

drop policy solicitud_empleados_delete on solicitud_empleados;
create policy solicitud_empleados_delete on solicitud_empleados for delete to authenticated
  using (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_empleados.solicitud_id
        and s.estado_solicitud = 'PENDIENTE'
        and fn_puede_modificar(s.area_id, s.sector_id, s.proceso_id)
    )
  );

-- El update sigue permitiendo también admin/estado ABIERTA porque ahí es
-- donde el RPC de aprobación (SECURITY DEFINER, corre como postgres → ya
-- bypassa RLS igual) actualiza estado_aprobacion. Esta policy solo importa
-- si alguien intenta un UPDATE directo desde el cliente (no vía RPC); la
-- dejamos algo más permisiva a propósito para no bloquear ningún RPC futuro
-- que necesite tocar la fila en ABIERTA, pero el candado real de "qué se
-- puede editar y cuándo" vive en los RPC, no acá.
-- (sin cambios respecto a 0013 para esta policy)

-- ============================================================================
-- Cómo probar (con el cliente normal de Supabase, no service_role, sobre una
-- solicitud ABIERTA):
--   supabase.from('solicitud_empleados').insert({solicitud_id, empleado_id})
--   → debe fallar por RLS (0 filas afectadas / error de policy), incluso si
--   se intenta pasando por alto rpc_agregar_empleado.
-- ============================================================================
