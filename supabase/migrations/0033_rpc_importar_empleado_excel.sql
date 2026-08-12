-- ============================================================================
-- 0033 · rpc_importar_empleado_excel — variante de rpc_upsert_empleado para
-- import masivo desde Excel
-- ----------------------------------------------------------------------------
-- Por qué una función separada y no reusar rpc_upsert_empleado tal cual: un
-- archivo Excel de RRHH va a traer nombres ("Producción", "Envasado"), no
-- UUIDs — nadie carga un Excel con ids de Postgres a mano. Esta función
-- resuelve área/sector/proceso por NOMBRE (con mensajes de error claros si
-- no encuentra la coincidencia) y después delega en la misma lógica de
-- upsert que ya usa el alta manual, para no duplicarla.
-- ============================================================================

create or replace function rpc_importar_empleado_excel(
  p_legajo text,
  p_nombre_completo text,
  p_categoria_codigo text,
  p_area_nombre text,
  p_sector_nombre text,
  p_proceso_nombre text,
  p_estado text default 'ACTIVO'
)
returns empleados
language plpgsql security definer set search_path = public as $$
declare
  v_area_id uuid;
  v_sector_id uuid;
  v_proceso_id uuid;
begin
  if not fn_es_admin() then
    raise exception 'Solo un administrador puede importar empleados';
  end if;

  if p_area_nombre is not null and length(trim(p_area_nombre)) > 0 then
    select id into v_area_id from areas where nombre = trim(p_area_nombre);
    if v_area_id is null then
      raise exception 'No existe el área "%"', p_area_nombre;
    end if;
  end if;

  if p_sector_nombre is not null and length(trim(p_sector_nombre)) > 0 then
    if v_area_id is null then
      raise exception 'No se puede resolver el sector "%" sin un área válida', p_sector_nombre;
    end if;
    select id into v_sector_id from sectores where nombre = trim(p_sector_nombre) and area_id = v_area_id;
    if v_sector_id is null then
      raise exception 'No existe el sector "%" dentro del área "%"', p_sector_nombre, p_area_nombre;
    end if;
  end if;

  if p_proceso_nombre is not null and length(trim(p_proceso_nombre)) > 0 then
    if v_sector_id is null then
      raise exception 'No se puede resolver el proceso "%" sin un sector válido', p_proceso_nombre;
    end if;
    select id into v_proceso_id from procesos where nombre = trim(p_proceso_nombre) and sector_id = v_sector_id;
    if v_proceso_id is null then
      raise exception 'No existe el proceso "%" dentro del sector "%"', p_proceso_nombre, p_sector_nombre;
    end if;
  end if;

  -- Reusa la misma función que el alta manual (rpc_upsert_empleado, 0016):
  -- mismo upsert por legajo, misma validación de categoría, mismo
  -- fn_trigger_validar_jerarquia (0030) corriendo igual por ser un INSERT/
  -- UPDATE normal sobre `empleados`.
  return rpc_upsert_empleado(
    p_legajo := p_legajo,
    p_nombre_completo := p_nombre_completo,
    p_categoria_codigo := p_categoria_codigo,
    p_area_id := v_area_id,
    p_sector_id := v_sector_id,
    p_proceso_id := v_proceso_id,
    p_estado := p_estado::estado_empleado
  );
end;
$$;

-- ============================================================================
-- Cómo probar:
--   select * from rpc_importar_empleado_excel('9999','Prueba Import','CAT001','<nombre de área real>',null,null,'ACTIVO');
--   select * from rpc_importar_empleado_excel('9999','Prueba Import','CAT001','Área que no existe',null,null,'ACTIVO');
--   → debe fallar: 'No existe el área "Área que no existe"'
-- ============================================================================
