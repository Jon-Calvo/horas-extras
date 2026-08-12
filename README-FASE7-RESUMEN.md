# Fase 7 — Resumen y verificación

## Migraciones nuevas (después de tu `0035`, ninguna toca migraciones previas)

| Archivo | Qué agrega |
|---|---|
| `0036_legajo_obligatorio_y_fusion_empleados.sql` | `rpc_upsert_empleado` ahora rechaza legajo vacío; `rpc_fusionar_empleados` para corregir duplicados ya existentes |
| `0037_eliminar_o_inactivar_empleado.sql` | `rpc_eliminar_o_inactivar_empleado` (decide DELETE físico vs. `INACTIVO` según historial) + policy de RLS explícita de `DELETE` en `empleados` |

## Archivos

**NUEVO**
```
supabase/migrations/0036_legajo_obligatorio_y_fusion_empleados.sql
supabase/migrations/0037_eliminar_o_inactivar_empleado.sql
app/(dashboard)/solicitudes/exportar-solicitudes-boton.tsx
README-FASE7-1-2-ANALISIS.md
README-FASE7-3-ANALISIS.md
README-FASE7-4-ANALISIS.md
README-FASE7-5-ANALISIS.md   (solo análisis, sin código — Fase 7.5 no se implementó a propósito)
```

**REEMPLAZO** (cambios acotados, no reescrituras completas — ver detalle abajo)
```
lib/supabase/rpc.ts                              — 2 wrappers nuevos (fusionarEmpleados, eliminarOInactivarEmpleado)
app/(dashboard)/admin/empleados/actions.ts        — 2 Server Actions nuevas (fusionarEmpleadosAction, eliminarEmpleadoAction)
app/(dashboard)/admin/empleados/empleados-lista.tsx — botón "Eliminar" (solo admin) + panel de fusión
app/(dashboard)/admin/empleados/page.tsx          — trae fn_es_admin y lo pasa a EmpleadosLista
app/(dashboard)/solicitudes/actions.ts            — 1 Server Action nueva (exportarSolicitudesDetalladoAction)
app/(dashboard)/solicitudes/page.tsx              — agrega el botón de exportar detallado
```

**NO TOCADO** (tal como pediste): `motivos/`, `feriados/`, `bandas-horarias/`,
`ib/` (páginas y actions), ni `components/excel/*`, ni la ubicación de
`admin-entity-crud.tsx` que ya reorganizaste — nada de esto tenía relación
con lo pedido en esta fase.

## Por qué cada cambio es acotado, no una reescritura

- `rpc.ts`: solo agregué las 2 funciones dentro de `empleadosRpc()` que ya
  existía — no toqué `solicitudesRpc()` ni `maestrosRpc()` (y no reintroduje
  el bloque duplicado que ya habías sacado del archivo #18).
- `empleados/actions.ts`: agregué 2 funciones al final del archivo,
  `guardarEmpleado` e `importarFilaEmpleado` quedaron intactas.
- `empleados-lista.tsx`: si se reescribió completo porque el botón
  "Eliminar" y el panel de fusión tocan la tabla en varios puntos (la fila,
  el header con el toggle del panel) — pero el `EmpleadoForm` y el resto de
  la lógica de edición existente no cambiaron.

## Verificación final

- **¿Se rompe algo existente?** No — todos los cambios son aditivos
  (funciones nuevas, columnas de UI nuevas). `rpc_upsert_empleado` cambió de
  comportamiento en un solo punto (rechaza legajo vacío), que es
  exactamente la corrección pedida, no un efecto colateral.
- **¿Legajo obligatorio rompe el import ya funcionando?** No debería — si
  tus Excels de import siempre traían legajo real (el caso normal), no
  cambia nada. Solo bloquea el caso específico que causaba el bug.
- **Seguridad del botón Eliminar**: verificado en 3 capas — (1) UI lo
  oculta si no es admin, (2) `rpc_eliminar_o_inactivar_empleado` valida
  `fn_es_admin()` adentro, (3) policy de RLS explícita de `DELETE`. Un
  no-admin que llame `supabase.from('empleados').delete()` directo desde
  la consola del navegador queda bloqueado en la capa 3 sin llegar
  siquiera a la RPC.
- **Export detallado**: no modifica ninguna tabla, es de solo lectura
  sobre las vistas ya existentes (`vista_solicitudes_resumen`,
  `vista_solicitud_empleados_detalle`) — cero riesgo de efectos
  secundarios.

## Cómo probar

```sql
-- 7.1/7.2
select rpc_upsert_empleado('', 'Test', 'CAT001', null, null, null);  -- debe fallar
select rpc_fusionar_empleados('<id_bueno>', '<id_duplicado>');        -- fusiona

-- 7.3
select * from rpc_eliminar_o_inactivar_empleado('<id_sin_historial>');  -- ELIMINADO
select * from rpc_eliminar_o_inactivar_empleado('<id_con_historial>');  -- INACTIVADO
```

En la UI:
1. `/admin/empleados` → intentar guardar un empleado con legajo vacío
   (manual) → debe rechazarlo (ya lo hacía el form, ahora también la base).
2. Panel "Fusionar empleados duplicados" → elegir los dos "Juan Pérez" →
   confirmar → verificar que queda 1 solo registro con el ranking sumado.
3. Botón "Eliminar" en un empleado sin historial → debe desaparecer de la
   lista. En uno con historial → debe quedar en la lista pero con estado
   `INACTIVO`.
4. Con un usuario no-admin: el botón "Eliminar" no debe aparecer.
5. `/solicitudes` → aplicar algún filtro → "Exportar detallado" → abrir el
   `.xlsx` → confirmar 2 hojas, y que sumar "Horas" en la Hoja 1 da el
   total correcto (sin duplicar por empleado).

## Pendiente de tu confirmación

- **Fase 7.5** (importar solicitudes): quedó como análisis puro, sin
  código, tal como pediste. Recomendé el formato "espejo del export" (2
  hojas) — confirmámelo o decime otra preferencia y lo armo como una fase
  propia.