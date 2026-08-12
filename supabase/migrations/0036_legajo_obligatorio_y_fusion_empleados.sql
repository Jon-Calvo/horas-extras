-- ============================================================================
-- 0036 · Fase 7.1/7.2 — legajo obligatorio real (no solo NOT NULL a nivel
-- columna) + rpc_fusionar_empleados para corregir duplicados ya existentes
-- ----------------------------------------------------------------------------
-- Ver README-FASE7-1-2-ANALISIS.md para el diagnóstico completo. Resumen:
-- `legajo` ya era NOT NULL UNIQUE, pero '' (string vacío) es un valor
-- válido para NOT NULL — el import dejaba pasar filas sin legajo real,
-- generando un registro nuevo cada vez que el mismo empleado se
-- reimportaba con un legajo distinto (vacío la primera vez, real después).
-- ============================================================================

-- ---------- (1) legajo obligatorio de verdad, no solo NOT NULL -------------
-- create or replace sobre la función de 0016: única función que hace el
-- upsert real, tanto el alta manual (guardarEmpleado) como el import por
-- Excel (rpc_importar_empleado_excel) pasan por acá — un solo lugar donde
-- agregar esta validación cubre los dos caminos.
create or replace function rpc_upsert_empleado(
  p_legajo text,
  p_nombre_completo text,
  p_categoria_codigo text,
  p_area_id uuid,
  p_sector_id uuid,
  p_proceso_id uuid,
  p_estado estado_empleado default 'ACTIVO'
)
returns empleados
language plpgsql security definer set search_path = public as $$
declare
  v_categoria_id uuid;
  v_empleado empleados;
begin
  if not fn_es_admin() then
    raise exception 'Solo un administrador puede dar de alta/modificar empleados de forma masiva';
  end if;

  if p_legajo is null or length(trim(p_legajo)) = 0 then
    raise exception 'El legajo es obligatorio — no se pueden crear empleados sin legajo (corregí el dato de origen antes de importar)';
  end if;

  if p_nombre_completo is null or length(trim(p_nombre_completo)) = 0 then
    raise exception 'El nombre completo es obligatorio';
  end if;

  select id into v_categoria_id from categoria_tipos where codigo = p_categoria_codigo;
  if v_categoria_id is null then
    raise exception 'La categoría % no existe', p_categoria_codigo;
  end if;

  insert into empleados (legajo, nombre_completo, categoria_id, area_id, sector_id, proceso_id, estado)
  values (trim(p_legajo), trim(p_nombre_completo), v_categoria_id, p_area_id, p_sector_id, p_proceso_id, p_estado)
  on conflict (legajo) do update set
    nombre_completo = excluded.nombre_completo,
    categoria_id = excluded.categoria_id,
    area_id = excluded.area_id,
    sector_id = excluded.sector_id,
    proceso_id = excluded.proceso_id,
    estado = excluded.estado
  returning * into v_empleado;

  return v_empleado;
end;
$$;

-- ---------- (2) Fusionar dos registros que resultaron ser el mismo empleado
-- Uso puntual, supervisado por un ADMIN — nunca automático. Reasigna todo
-- el historial del que se descarta hacia el que se conserva, y suma el
-- ranking acumulado en ambos (representa horas reales de la misma persona).
create or replace function rpc_fusionar_empleados(p_conservar_id uuid, p_fusionar_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_conservar empleados;
  v_fusionar empleados;
begin
  if not fn_es_admin() then
    raise exception 'Solo un administrador puede fusionar empleados';
  end if;

  if p_conservar_id = p_fusionar_id then
    raise exception 'No se puede fusionar un empleado consigo mismo';
  end if;

  select * into v_conservar from empleados where id = p_conservar_id;
  select * into v_fusionar from empleados where id = p_fusionar_id;
  if v_conservar.id is null or v_fusionar.id is null then
    raise exception 'Alguno de los dos empleados no existe';
  end if;

  -- Si ambos están en la misma solicitud, reasignar rompería el
  -- unique(solicitud_id, empleado_id) — cortar acá con un mensaje claro en
  -- vez de dejar que reviente el constraint más abajo.
  if exists (
    select 1 from solicitud_empleados se1
    join solicitud_empleados se2 on se1.solicitud_id = se2.solicitud_id
    where se1.empleado_id = p_fusionar_id and se2.empleado_id = p_conservar_id
  ) then
    raise exception 'No se puede fusionar: ambos empleados están en la misma solicitud — revisalo manualmente primero';
  end if;

  update solicitud_empleados set empleado_id = p_conservar_id where empleado_id = p_fusionar_id;
  update ranking_horas_historico set empleado_id = p_conservar_id where empleado_id = p_fusionar_id;

  update empleados set ranking_horas = ranking_horas + v_fusionar.ranking_horas where id = p_conservar_id;

  delete from empleados where id = p_fusionar_id;

  insert into auditoria (usuario_id, accion, tabla, registro_id, origen, datos_anteriores, datos_nuevos)
  values (
    auth.uid(), 'DELETE', 'empleados', p_fusionar_id, 'USUARIO',
    to_jsonb(v_fusionar), jsonb_build_object('fusionado_en', p_conservar_id, 'legajo_conservado', v_conservar.legajo)
  );
end;
$$;

-- ============================================================================
-- Cómo probar:
--   select rpc_upsert_empleado('', 'Test', 'CAT001', null, null, null);
--   → debe fallar: 'El legajo es obligatorio...'
--
--   -- fusión (con los ids reales del "Juan Pérez" duplicado):
--   select rpc_fusionar_empleados('<id-con-legajo-12345>', '<id-con-legajo-vacio>');
--   select legajo, ranking_horas from empleados where nombre_completo ilike '%Pérez%';
--   → debe quedar 1 sola fila, con el legajo bueno y el ranking sumado
--   select count(*) from empleados where id = '<id-con-legajo-vacio>'; → 0
-- ============================================================================
