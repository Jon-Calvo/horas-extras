-- ============================================================================
-- 0030 · Validación jerárquica: sector debe pertenecer al área, proceso al
-- sector — enforced en la base, no solo en el frontend (punto D de Fase 5.3)
-- ----------------------------------------------------------------------------
-- Una sola función de validación, reusada por un trigger en las 3 tablas
-- que reciben la terna area/sector/proceso de forma independiente:
-- usuarios, empleados, solicitudes. Cubre cualquier camino de entrada
-- (RPC, admin, un futuro import de Excel) sin tener que acordarse de
-- llamarla en cada lugar nuevo.
-- ============================================================================

create or replace function fn_validar_jerarquia_organizacional(p_area_id uuid, p_sector_id uuid, p_proceso_id uuid)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if p_sector_id is not null then
    if p_area_id is null then
      raise exception 'No se puede especificar un sector sin especificar su área';
    end if;
    if not exists (select 1 from sectores where id = p_sector_id and area_id = p_area_id) then
      raise exception 'El sector seleccionado no pertenece al área seleccionada';
    end if;
  end if;

  if p_proceso_id is not null then
    if p_sector_id is null then
      raise exception 'No se puede especificar un proceso sin especificar su sector';
    end if;
    if not exists (select 1 from procesos where id = p_proceso_id and sector_id = p_sector_id) then
      raise exception 'El proceso seleccionado no pertenece al sector seleccionado';
    end if;
  end if;
end;
$$;

create or replace function fn_trigger_validar_jerarquia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform fn_validar_jerarquia_organizacional(new.area_id, new.sector_id, new.proceso_id);
  return new;
end;
$$;

create trigger trg_validar_jerarquia_usuarios
  before insert or update of area_id, sector_id, proceso_id on usuarios
  for each row execute function fn_trigger_validar_jerarquia();

create trigger trg_validar_jerarquia_empleados
  before insert or update of area_id, sector_id, proceso_id on empleados
  for each row execute function fn_trigger_validar_jerarquia();

create trigger trg_validar_jerarquia_solicitudes
  before insert or update of area_id, sector_id, proceso_id on solicitudes
  for each row execute function fn_trigger_validar_jerarquia();

-- ============================================================================
-- Cómo probar:
--   -- tomar un sector que NO pertenezca a la primera área de la lista:
--   update usuarios set area_id = (select id from areas limit 1),
--                        sector_id = (select id from sectores where area_id <> (select id from areas limit 1) limit 1)
--     where id = '<algún usuario>';
--   → debe fallar: 'El sector seleccionado no pertenece al área seleccionada'
-- ============================================================================