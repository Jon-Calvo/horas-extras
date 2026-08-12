# Fase 6 — Import/export de Excel + job de reseteo de ranking

## Migraciones nuevas (después de tu `0032`)

| Archivo | Qué agrega |
|---|---|
| `0033_rpc_importar_empleado_excel.sql` | Variante de `rpc_upsert_empleado` que resuelve área/sector/proceso por **nombre** (para import desde Excel) |
| `0034_job_reseteo_ranking.sql` | `pg_cron` diario + `fn_resetear_ranking_si_corresponde` (decide solo si corresponde según el corte de calendario) + `rpc_forzar_reseteo_ranking` (manual/pruebas) |
| `0035_vista_empleados_resumen.sql` | Vista para `/admin/empleados` (nombres en vez de ids, `security_invoker=true`) |

## Qué instalar

```bash
npm install xlsx
```
(Ya estaba anotado como pendiente desde el README de Fase 3 — si no lo
instalaste todavía, es el momento.)

## Import/export de Excel

**Decisión de diseño clave:** los componentes de Excel (`ExportarExcelBoton`,
`ImportarExcelGenerico`) son genéricos y reusan la **misma** lista de
`campos` (`CampoAdmin[]`) que ya define cada pantalla para su tabla/form —
no hay un mapeo de columnas separado que mantener. Esto significa que:
- El Excel exportado tiene las mismas columnas, con las mismas etiquetas,
  que ya ves en pantalla.
- El Excel importado se valida fila por fila con la **misma** Server
  Action que ya usa el alta manual (`guardarMotivo`, `guardarFeriado`,
  etc.) — una fila del Excel pasa exactamente por las mismas reglas de
  negocio que si la hubieras tipeado a mano.
- No aborta el lote si una fila falla — muestra el resultado fila por fila
  (mismo criterio que `rpc_agregar_empleados_masivo` de Fase 4).

Aplicado a: **Motivos, Feriados, Bandas horarias, IB** (reusando sus
`CAMPOS` ya existentes) y **Empleados** (nuevo módulo completo, no existía
pantalla de administración todavía).

**Categorías queda afuera del import genérico a propósito** — el modelo
versionado por vigencia no encaja con un simple upsert fila-por-fila (¿qué
pasa si el Excel trae un valor para una categoría que ya tiene una
vigencia abierta? Necesitaría el mismo criterio de
`rpc_actualizar_valor_categoria`, con fecha de vigencia explícita por
fila). Si lo necesitás, es una extensión chica sobre lo que ya existe —
avisame.

### Import de empleados — el más elaborado

Un Excel de RRHH va a traer **nombres** ("Producción", "Envasado"), no
UUIDs de Postgres. `rpc_importar_empleado_excel` (0033) resuelve
Área/Sector/Proceso por nombre del lado de la base (con mensajes de error
específicos si no encuentra la coincidencia), y delega en la misma lógica
que el alta manual — no duplica código.

## Módulo de administración de Empleados (nuevo)

No existía pantalla para esto todavía (solo el RPC de Fase 3). Agregado
completo: listado con buscador, alta/edición manual con los mismos selects
en cascada **completamente controlados** que corregimos en `UsuarioForm`
en Fase 5.3 (mismo bug, mismo fix, aplicado desde el vamos acá para no
reintroducirlo).

## Job de reseteo de ranking

- `pg_cron` corre **todos los días** a las 03:00 ART; la función decide
  internamente si HOY corresponde resetear según
  `configuracion_general.ranking_periodo` — más robusto que reprogramar el
  cron cada vez que cambia la configuración.
- Calcula "hoy" explícitamente en `America/Argentina/Buenos_Aires` (no
  `current_date` a secas) — mismo criterio de precisión horaria que
  venimos aplicando en todo el proyecto.
- Snapshot en `ranking_horas_historico` **antes** de resetear a 0 (ya
  existía la tabla desde Fase 2, ahora se usa).
- Botón "Forzar reseteo ahora" en `/admin/configuracion`, para pruebas o
  para corregir un corte que no llegó a correr — con confirmación porque
  resetea sin importar la fecha.

## Cómo probar

```sql
-- Confirmar que el cron quedó programado (falla si pg_cron no se pudo
-- habilitar automáticamente — en ese caso, Dashboard → Database → Extensions):
select * from cron.job where jobname = 'reseteo-ranking-diario';

-- Forzar un reseteo de prueba:
select rpc_forzar_reseteo_ranking();
select * from ranking_horas_historico order by fecha_reseteo desc limit 5;

-- Import de empleados:
select * from rpc_importar_empleado_excel('9999','Prueba','CAT001','<área real>',null,null,'ACTIVO');
```

En la UI:
1. `/admin/motivos` (o feriados/bandas-horarias/ib) → "Exportar Excel" →
   confirmar que baja un `.xlsx` con las columnas correctas.
2. Editar ese mismo archivo (agregar una fila) → "Importar Excel" →
   seleccionarlo → confirmar el preview → confirmar import → ver el
   resultado fila por fila.
3. `/admin/empleados` → alta manual de un empleado, después "Descargar
   plantilla" → completarla con 2-3 filas → importar → confirmar que
   aparecen en el listado.
4. `/admin/configuracion` → "Forzar reseteo ahora" → confirmar que
   `ranking_horas` de los empleados activos vuelve a 0 y aparece una fila
   nueva en `ranking_horas_historico`.

## Estado del proyecto

Con esto quedan cubiertas las 6 fases planteadas al inicio del proyecto
(arquitectura → esquema → motor de negocio → pantallas → administración →
Excel/ranking), más las correcciones de Fase 5.1/5.2/5.3 que salieron de
las pruebas reales. El sistema tiene: autenticación, RLS de punta a punta,
workflow de solicitudes con estados coherentes, cálculo automático de
horas/importes, aprobación individual y masiva, control de ingreso,
notificaciones por email, administración completa de las 8 tablas
maestras (incluida la organizacional en su propio maestro de 3 paneles),
gestión de usuarios con permisos granulares, y ahora import/export de
Excel + el job de ranking corriendo solo.