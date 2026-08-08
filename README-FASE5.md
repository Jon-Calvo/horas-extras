# Fase 5 — ABM de tablas maestras + aprobación masiva + filtro por motivo

## Migraciones nuevas

| Archivo | Qué agrega |
|---|---|
| `0025_rpc_actualizar_valor_categoria.sql` | RPC que cierra la vigencia actual de una categoría y abre la nueva en una sola transacción (evita chocar contra el `EXCLUDE` constraint de `categoria_valores`) |

El resto del ABM (motivos, bandas horarias, feriados, IB, configuración
general) no necesitó RPC nuevo: la RLS de esas tablas (definida desde
Fase 2) ya restringe escritura a `fn_es_admin()`, así que el frontend
escribe directo con el cliente normal de Supabase — la autorización real
sigue viviendo en la base.

## Qué se agregó

```
app/(dashboard)/admin/layout.tsx                 — guard por fn_es_admin() + nav entre secciones
app/(dashboard)/admin/page.tsx                    — índice

components/admin-entity-crud.tsx                  — ABM genérico (listado + alta/edición inline)
app/(dashboard)/admin/motivos/                    — usa el ABM genérico
app/(dashboard)/admin/bandas-horarias/            — usa el ABM genérico
app/(dashboard)/admin/feriados/                   — usa el ABM genérico + borrado físico (única maestra sin FK entrante)
app/(dashboard)/admin/ib/                         — usa el ABM genérico + traduce el error del EXCLUDE constraint

app/(dashboard)/admin/categorias/                 — pantalla propia (no el ABM genérico): tipo + historial de valores
app/(dashboard)/admin/categorias/[id]/            — historial de vigencias + alta de nuevo valor (rpc_actualizar_valor_categoria)

app/(dashboard)/admin/configuracion/              — form de fila única (no es una lista, no usa el ABM genérico)

app/(dashboard)/solicitudes/actions.ts            — nueva: aprobacionMasivaListadoAction
app/(dashboard)/solicitudes/solicitudes-listado.tsx — wrapper cliente: selección de filas + barra de acciones masivas
app/(dashboard)/solicitudes/columns.tsx           — nueva columna Motivo + selectColumn (checkbox, exportada aparte para no afectar otros usos de solicitudColumns)
app/(dashboard)/solicitudes/solicitudes-filtros.tsx — filtro por Motivo agregado
components/data-table.tsx                         — soporte opcional de selección de filas (rowSelection/onRowSelectionChange), sin romper el uso existente sin esas props

lib/format.ts                                     — nueva: formatFechaSolo (ver más abajo)
components/sidebar.tsx                            — link "Administración", oculto si el usuario no es admin
```

## Decisiones de diseño

- **ABM genérico vs. pantallas propias**: motivos/bandas/feriados/IB
  comparten el mismo patrón (campos planos, sin relaciones) → un solo
  componente (`AdminEntityCrud`) los cubre a los 4. Categorías (versionado
  por vigencia) y configuración general (fila única) rompen ese patrón, así
  que tienen pantallas a medida en vez de forzarlas dentro del genérico.
- **Feriados es la única maestra con borrado físico.** No tiene ninguna FK
  entrante (solo se consulta por fecha en el motor de cálculo), así que no
  hay riesgo de romper referencias. Las demás (motivos, bandas, categorías,
  IB) se desactivan con el campo `activo` — tienen empleados/solicitudes
  que las referencian.
- **`rpc_actualizar_valor_categoria` en vez de dos updates separados desde
  el frontend**: cerrar la vigencia vieja y abrir la nueva son dos pasos
  que tienen que ser atómicos — si el frontend hiciera un `update` seguido
  de un `insert`, una falla a mitad de camino dejaría el historial roto (o
  el `EXCLUDE` constraint directamente rechazaría el segundo paso si las
  fechas se solapan).
- **Aprobación masiva desde el listado reutiliza `rpc_aprobacion_masiva`**
  (ya existía desde Fase 3, se había armado para la pantalla de detalle).
  Importante: ese RPC es atómico — si una sola solicitud del lote no está
  autorizada o no está en `PENDIENTE`/`ABIERTA`, se aborta *todo* el lote,
  no hace un resumen parcial como `rpc_agregar_empleados_masivo` (ese sí
  procesa uno por uno). Lo dejé documentado en el comentario del action;
  si preferís que la aprobación masiva también sea parcial (como la carga
  de empleados), es un cambio chico sobre el RPC — avisame.
- **Checkbox de selección deshabilitado para solicitudes que no están en
  `PENDIENTE`/`ABIERTA`**: evita que alguien arme un lote que va a fallar
  entero por incluir una solicitud ya `CERRADA`.

## Bug de timezone encontrado de paso

Al mostrar el historial de vigencias de categorías (columnas `date` puras,
sin hora) noté que pasarlas por `formatFecha` (que asume timezone
Argentina) las corría un día: `"2026-07-01"` se interpreta como medianoche
UTC, y convertir eso a UTC-3 lo manda al 30/06 a las 21:00. Agregué
`formatFechaSolo` en `lib/format.ts`, que reformatea el string `date`
directamente sin pasar por `Date`/timezone — usalo para cualquier columna
`date` (no `timestamptz`) que muestres en pantallas futuras (ej: si en
Fase 6 mostrás `fecha_alta`/`fecha_baja` de empleados).

## Cómo probar

```sql
-- valor de categoría
select * from rpc_actualizar_valor_categoria(
  (select id from categoria_tipos where codigo='CAT001'), 3800, 'ARS', current_date + 7
);
```

En la UI (con tu usuario admin):
1. `/admin/motivos`, `/admin/bandas-horarias`, `/admin/feriados`, `/admin/ib`
   → probá alta, edición, y en feriados también borrado.
2. `/admin/categorias` → entrá al detalle de una categoría, cargá un nuevo
   valor vigente con fecha futura, confirmá que el historial muestra la
   vigencia anterior cerrada un día antes.
3. `/admin/configuracion` → cambiá el período de ranking y guardá.
4. `/solicitudes` → probá el filtro por Motivo, y seleccioná 2-3 solicitudes
   `PENDIENTE`/`ABIERTA` del mismo scope para aprobar en lote.
5. Con un usuario NO admin: `/admin` debería mostrar "no tenés permisos" y
   el link de Administración no debería aparecer en la sidebar.

## Qué queda para más adelante

- Filtro por tipo de motivo (Productivo/Improductivo) y atajos de mes/año.
- Import/export de Excel de tablas maestras y empleados (Fase 6 original).
- Job de reseteo periódico de ranking (Fase 6 original).
- Si preferís aprobación masiva parcial (no atómica) en vez del
  comportamiento actual, decime y lo ajusto.
