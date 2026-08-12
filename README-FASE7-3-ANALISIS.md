# Fase 7.3 — Análisis: eliminar vs. inactivar empleados

## FKs entrantes a `empleados` (revisadas, no inventadas)

| Tabla | Columna | On delete | Bloquea DELETE físico si hay filas |
|---|---|---|---|
| `solicitud_empleados` | `empleado_id` | `NO ACTION` (default) | Sí |
| `ranking_horas_historico` | `empleado_id` | `NO ACTION` (default) | Sí |

Ninguna de las dos tiene `ON DELETE CASCADE` — a propósito, desde que se
diseñaron (Fase 2/3): nunca quisimos que borrar un empleado se llevara
puesto su historial de solicitudes o de ranking.

`solicitud_empleado_detalle` (cálculos) y el estado de aprobación/control
de ingreso viven en la fila de `solicitud_empleados`, no tienen FK propia
hacia `empleados` — así que ya quedan cubiertos indirectamente por el
bloqueo de `solicitud_empleados`.

## Conclusión

- **Si el empleado nunca apareció en ninguna solicitud y no tiene ranking
  histórico**: no hay nada que preservar — DELETE físico es seguro y
  correcto (ej: se cargó mal por error y se detecta al toque).
- **Si el empleado tiene cualquier historial** (una sola solicitud vieja,
  un solo reseteo de ranking ya corrido): el DELETE físico **ya está
  bloqueado por las FK actuales** — Postgres lo va a rechazar solo. La
  única opción correcta es baja lógica (`estado = 'INACTIVO'`), que ya
  existe en el modelo desde Fase 2 y ya es respetada por todo el sistema
  (`fn_agregar_empleado_interno` exige `estado = 'ACTIVO'` para poder
  sumarlo a una solicitud nueva).

**Diseño elegido:** un solo botón "Eliminar" que decide sola cuál de las
dos acciones corresponde, y le informa al admin cuál se ejecutó — en vez
de forzar al usuario a saber de antemano si el empleado tiene historial o
no. `rpc_eliminar_o_inactivar_empleado` revisa la existencia de
`solicitud_empleados`/`ranking_horas_historico` y actúa en consecuencia.

## Seguridad

- La función es `SECURITY DEFINER` con `fn_es_admin()` chequeado
  explícitamente adentro — mismo patrón que **todas** las RPC de este
  proyecto.
- Además, agrego una policy de RLS explícita de `DELETE` en `empleados`
  restringida a admin — aunque técnicamente ya estaba bloqueado por
  omisión (RLS activo sin ninguna policy de `DELETE` deniega por defecto a
  cualquier rol no-superuser), una policy explícita lo deja documentado en
  el propio esquema en vez de depender de "no hay policy, así que no se
  puede" — más legible para quien audite la base después.
- Esto cumple el punto 2 de tu pedido: aunque alguien intente `supabase
  .from('empleados').delete()` directo desde el cliente (saltándose el
  botón/RPC), la RLS lo bloquea igual si no es admin.