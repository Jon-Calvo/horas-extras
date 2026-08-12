# Fase 7.1 — Análisis del problema de empleados

## Estructura actual de `empleados` (tal como quedó desde 0005, sin tocar)

```sql
create table empleados (
  id                uuid primary key default gen_random_uuid(),
  legajo            text not null unique,        -- ← clave real del negocio
  nombre_completo   text not null,
  categoria_id      uuid not null references categoria_tipos(id),
  area_id           uuid references areas(id),
  sector_id         uuid references sectores(id),
  proceso_id        uuid references procesos(id),
  ranking_horas     numeric(10,2) not null default 0,
  ib_id             uuid references ib_configuracion(id),
  estado            estado_empleado not null default 'ACTIVO',
  fecha_alta        date not null default current_date,
  fecha_baja        date,
  ...
);
```

**`legajo` ya es `NOT NULL UNIQUE`.** Ahí está la raíz del bug — no es que
faltara una restricción, es que **el import dejó pasar una cadena vacía
(`''`) como si fuera "sin legajo"**. `''` es un valor válido para una
columna `NOT NULL` (no es `NULL`), así que la restricción nunca se disparó.

## Cómo se reprodujo exactamente

1. Excel #1: `Legajo` vacío, `Nombre completo` = "Juan Pérez".
   `rpc_importar_empleado_excel` recibe `p_legajo = ''` → llama a
   `rpc_upsert_empleado(p_legajo := '', ...)` → `insert into empleados
   (legajo, ...) values ('', ...) on conflict (legajo) do update ...` →
   como no existía ninguna fila con `legajo = ''` todavía, inserta una
   nueva. Fila A: `legajo=''`.
2. Excel #2 (mismo empleado, ahora con legajo real): `p_legajo = '12345'`
   → `on conflict (legajo)` busca una fila con `legajo = '12345'` — no
   existe (la fila A tiene `legajo=''`, no `'12345'`) → inserta una fila
   **nueva**. Fila B: `legajo='12345'`.

El `ON CONFLICT (legajo)` funciona perfectamente bien — el problema es que
nunca debió haber una Fila A con legajo vacío para empezar.

## RPC involucradas

- `rpc_upsert_empleado` (0016): usada por el alta manual (`guardarEmpleado`)
  y por `rpc_importar_empleado_excel`. Hace `upsert` por `legajo` — **no
  valida que `legajo` no esté vacío**, solo que la columna reciba *algo*
  (que puede ser `''`).
- `rpc_importar_empleado_excel` (0033): resuelve área/sector/proceso por
  nombre y delega en `rpc_upsert_empleado`. Hereda el mismo hueco.

## RLS / FK relevantes

- `empleados.categoria_id` → `categoria_tipos(id)`: `not null`, sin
  relación con este bug.
- Nada en RLS permite ni bloquea esto — es puramente una validación de
  negocio faltante, no un tema de permisos.

## Decisión: NO hacer matching por nombre

Evalué la opción de "si no hay legajo, buscar por nombre" y la descarto
activamente, por lo que vos mismo señalaste como riesgo (punto D): dos
empleados legítimamente distintos pueden llamarse igual (dos "Juan Pérez"
en una empresa grande no es raro), y fusionarlos por coincidencia de
nombre es un error de integridad de datos mucho peor que el que estamos
resolviendo — silencioso, y potencialmente afecta ranking/horas/aprobaciones
de la persona equivocada.

## Estrategia elegida

**En vez de intentar reconciliar automáticamente registros sin legajo con
registros que después sí lo tienen, se ataca la causa raíz: nunca permitir
que se cree un empleado sin legajo, ni por el form manual ni por Excel.**
`legajo` es la clave de negocio real (así está diseñada la tabla desde
Fase 2) — un empleado sin legajo no es "un caso válido pendiente de
completar", es un dato incompleto que hay que corregir en el Excel de
origen antes de importar.

Esto resuelve A y B de tu pedido por construcción: si nunca se puede crear
sin legajo, nunca hay "un legajo que aparece después para completar un
registro existente" — porque el registro existente siempre tuvo legajo
desde el alta.

**Para el caso ya existente en tu base** (el "Juan Pérez" duplicado que ya
pasó), agrego una herramienta separada y explícita — `rpc_fusionar_empleados`
— para que un ADMIN fusione manualmente dos registros que resultaron ser
la misma persona, con control humano en el medio (nunca automático), que
reasigna todo el historial (solicitudes, ranking histórico) del registro
que se descarta hacia el que se conserva, y suma el `ranking_horas`
acumulado en ambos.

Esto separa claramente dos problemas que tenían la misma raíz visible pero
son conceptualmente distintos: **prevenir** que vuelva a pasar (validación
en el RPC) vs. **corregir** lo que ya pasó (herramienta de fusión, uso
puntual y supervisado).

Si preferís una estrategia distinta (por ejemplo, permitir legajo vacío
pero con un flag explícito "pendiente de completar" en vez de rechazarlo)
avisame — pero mi recomendación como arquitecto es la de arriba: es la que
menos superficie de error introduce.