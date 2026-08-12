-- ============================================================================
-- 0034 · Job de reseteo periódico de ranking (mensual/trimestral/anual,
-- según configuracion_general.ranking_periodo)
-- ----------------------------------------------------------------------------
-- Diseño (decidido en Fase 1): corte fijo de calendario. MENSUAL = día 1 de
-- cada mes, TRIMESTRAL = trimestre calendario (ene-mar/abr-jun/jul-sep/oct-dic),
-- ANUAL = 1 de enero. Reseteo a 0 (no decae), aplica igual a todos los
-- empleados ACTIVO. Snapshot en ranking_horas_historico ANTES de resetear.
--
-- Enfoque: un job de pg_cron corre TODOS los días a la misma hora, y la
-- función internamente decide si HOY corresponde resetear según el período
-- configurado — más robusto que reprogramar el cron cada vez que cambia
-- `ranking_periodo` desde /admin/configuracion (que ya es posible sin tocar
-- nada de esto: la función lee la configuración vigente en cada corrida).
--
-- Timezone: se calcula "hoy" explícitamente en America/Argentina/Buenos_Aires
-- (no `current_date` a secas, que depende del timezone de la sesión/servidor
-- — mismo criterio de precisión horaria que venimos aplicando en todo el
-- proyecto). El cron corre a las 06:00 UTC = 03:00 ART, cómodamente después
-- de la medianoche argentina.
-- ============================================================================

-- Puede requerir habilitar la extensión desde el Dashboard (Database →
-- Extensions → pg_cron) si este CREATE EXTENSION falla por permisos.
create extension if not exists pg_cron with schema extensions;

create or replace function fn_es_dia_de_reseteo(p_periodo ranking_periodo, p_fecha date)
returns boolean
language sql
immutable
as $$
  select case p_periodo
    when 'MENSUAL'    then extract(day from p_fecha) = 1
    when 'TRIMESTRAL' then extract(day from p_fecha) = 1 and extract(month from p_fecha) in (1, 4, 7, 10)
    when 'ANUAL'      then extract(day from p_fecha) = 1 and extract(month from p_fecha) = 1
    else false
  end;
$$;

create or replace function fn_resetear_ranking_si_corresponde(p_forzar boolean default false)
returns integer  -- cantidad de empleados reseteados (0 si no correspondía)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo ranking_periodo;
  v_hoy date;
  v_periodo_label text;
  v_cantidad integer;
begin
  v_hoy := (now() at time zone 'America/Argentina/Buenos_Aires')::date;

  select ranking_periodo into v_periodo from configuracion_general where id = 1;

  if not p_forzar and not fn_es_dia_de_reseteo(v_periodo, v_hoy) then
    return 0;
  end if;

  -- Etiqueta del período que ACABA de terminar (el día anterior al corte),
  -- no del día del corte en sí — ej: si hoy es 1/jul y el período es
  -- MENSUAL, lo que se está cerrando es junio ('2026-06'), no julio.
  v_periodo_label := case v_periodo
    when 'MENSUAL'    then to_char(v_hoy - interval '1 day', 'YYYY-MM')
    when 'TRIMESTRAL' then extract(year from v_hoy - interval '1 day')::text || '-Q' || extract(quarter from v_hoy - interval '1 day')::text
    when 'ANUAL'      then extract(year from v_hoy - interval '1 day')::text
    else to_char(v_hoy, 'YYYY-MM-DD')
  end;

  insert into ranking_horas_historico (empleado_id, periodo, ranking_horas_final, ib_final, fecha_reseteo)
  select id, v_periodo_label, ranking_horas, ib_id, now()
  from empleados
  where estado = 'ACTIVO';

  get diagnostics v_cantidad = row_count;

  update empleados set ranking_horas = 0 where estado = 'ACTIVO';
  -- El trigger de 0009 (fn_recalcular_ib) recalcula el IB de cada empleado
  -- automáticamente al pisar ranking_horas — no hace falta tocarlo acá.

  return v_cantidad;
end;
$$;

-- RPC para forzar un reseteo manual desde /admin/configuracion (pruebas o
-- corrección de un corte que no corrió). Salta el chequeo de "¿corresponde
-- hoy?" — usar con cuidado, resetea sin importar la fecha.
create or replace function rpc_forzar_reseteo_ranking()
returns integer
language plpgsql security definer set search_path = public as $$
begin
  if not fn_es_admin() then
    raise exception 'Solo un administrador puede forzar el reseteo de ranking';
  end if;
  return fn_resetear_ranking_si_corresponde(true);
end;
$$;

select cron.schedule(
  'reseteo-ranking-diario',
  '0 6 * * *',   -- 06:00 UTC = 03:00 ART, todos los días
  $$select fn_resetear_ranking_si_corresponde(false)$$
);

-- ============================================================================
-- Cómo probar:
--   -- forzar un reseteo ahora mismo, sin esperar al corte de calendario:
--   select rpc_forzar_reseteo_ranking();
--   select * from ranking_horas_historico order by fecha_reseteo desc limit 10;
--   select legajo, ranking_horas from empleados where estado='ACTIVO';  -- todos en 0
--
--   -- confirmar que el cron quedó programado:
--   select * from cron.job where jobname = 'reseteo-ranking-diario';
--
--   -- simular "no corresponde hoy" (ejemplo con período MENSUAL en un día
--   -- que no es 1): select fn_es_dia_de_reseteo('MENSUAL', '2026-07-15'); → false
-- ============================================================================
