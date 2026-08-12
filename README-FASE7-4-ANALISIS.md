# Fase 7.4 — Exportación detallada de solicitudes: Opción A vs B

## Recomendación: Opción B (2 hojas)

**Motivo decisivo, más allá de preferencia estética:** la Opción A (hoja
plana, una fila por empleado, repitiendo los datos de la solicitud)
introduce un **error de doble conteo** en cualquier análisis agregado. Si
alguien selecciona la columna "Horas" o "Importe" de la solicitud en la
hoja plana y hace un `SUM()` o una tabla dinámica, esos valores están
**repetidos una vez por cada empleado** de la solicitud — el total va a
salir inflado (una solicitud con 3 empleados suma su horas/importe *3*).
Esto no es un detalle menor para un sistema que se va a usar para
auditoría y análisis — es la forma más común en que un reporte de RRHH
termina con números mal en una planilla derivada, sin que nadie note el
error hasta mucho después.

La Opción B, al ser dos tablas normalizadas relacionadas por "Número"
(igual que dos tablas de una base relacional), es exactamente lo que
Power Query/tablas dinámicas de Excel esperan para modelar relaciones
1-a-N sin duplicar datos — se cargan las dos hojas como tablas separadas y
se relacionan por "Número" en el modelo de datos, sin ningún riesgo de
doble conteo.

**Implementado: Opción B.**
- Hoja 1 "Solicitudes": una fila por solicitud, con los totales correctos
  (no repetidos).
- Hoja 2 "Detalle empleados": una fila por empleado por solicitud, con
  "Número de Solicitud" como columna de enlace hacia la Hoja 1.

## Dónde vive

Botón "Exportar detallado" en el listado de solicitudes (`/solicitudes`),
al lado de los filtros — exporta exactamente el conjunto de solicitudes
que está viendo en pantalla en ese momento (mismos filtros aplicados:
área/sector/proceso/estado/solicitante/motivo/rango de fechas).