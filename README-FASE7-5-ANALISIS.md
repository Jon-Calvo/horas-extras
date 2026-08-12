# Fase 7.5 — Evaluación: ¿se puede importar solicitudes desde Excel?

**Conclusión corta: es técnicamente viable, pero es un proyecto en sí
mismo — meaningfully más grande que cualquiera de los imports que ya
existen. No lo implemento en esta entrega; dejo el análisis y una
recomendación de diseño para cuando lo confirmes.**

## Por qué es distinto a los imports que ya tenemos

Todos los imports actuales (motivos, feriados, bandas horarias, IB,
empleados) son **una fila del Excel = un registro de la base**. Una
solicitud no es eso: es **una solicitud + N empleados**, una relación
1-a-N. Ningún import que construimos hasta ahora tuvo que resolver "cómo
agrupo varias filas de Excel en un solo registro padre con sus hijos" —
es un tipo de import distinto (más parecido a importar un pedido con sus
líneas de detalle que a importar un catálogo plano).

## Qué campos se pueden importar directo, cuáles se derivan, cuáles nunca

| Campo | Origen | Por qué |
|---|---|---|
| Área / Sector / Proceso | Excel, por **nombre** | Mismo patrón que `rpc_importar_empleado_excel` — resolver por nombre del lado de la base |
| Motivo | Excel, por **nombre** | Igual que área/sector/proceso |
| Fecha/hora inicio y fin | Excel | Directo, con el mismo criterio de timezone Argentina que ya aplicamos en el form manual |
| Observación | Excel | Directo, opcional |
| Empleados del equipo (legajo) | Excel | Por legajo — igual que se resuelve el resto |
| **Horas / Importe** | **NUNCA del Excel** | Se recalculan siempre con `fn_calcular_detalle_solicitud_empleado` — importarlos directo permitiría que alguien cargue un importe manipulado o simplemente desactualizado (si cambió una banda horaria o una categoría desde que se armó el Excel). El motor de cálculo es la única fuente de verdad. |
| **IB / Ranking "al momento solicitado"** | **NUNCA del Excel** | Son un *snapshot* que el sistema toma automáticamente al agregar el empleado (`fn_solicitud_empleados_before_insert`) — no un dato que se cargue, es un efecto secundario del insert. Traerlo del Excel rompería esa garantía. |
| **Estado (solicitud o de cada empleado)** | **NUNCA del Excel** | Importar `estado_solicitud='CERRADA'` o `estado_aprobacion='APROBADO'` directo desde un Excel saltearía todo el workflow (Fase 5.2) y el control de permisos de aprobación — una solicitud importada tiene que nacer `PENDIENTE` y recorrer el mismo camino (`rpc_finalizar_carga`, aprobar/rechazar) que una cargada a mano. |

## Diseño propuesto (para cuando lo confirmes)

Una función nueva, `rpc_importar_solicitud_excel(...)`, que **no
reinventa nada** — arma la solicitud llamando a `rpc_crear_solicitud`
(resolviendo nombres a ids primero, mismo patrón que empleados) y después
llama a `fn_agregar_empleado_interno` por cada legajo de la fila —
exactamente las mismas funciones que ya usa el alta manual y el botón de
"Nueva solicitud". Ninguna validación de negocio (superposición horaria,
moneda única, antigüedad máxima, empleado activo, jerarquía
área/sector/proceso) se reimplementa — se hereda gratis por reusar las
mismas funciones.

## La complejidad real: el formato del Excel de entrada

Acá está el verdadero trabajo de diseño, y por qué prefiero que lo
confirmes antes de construirlo: un Excel de "una solicitud con varios
empleados" necesita una de estas dos formas, y cada una tiene un
trade-off distinto:

**Opción 1 — Espejo del export (2 hojas: Solicitudes + Detalle)**
Mismo formato que ya generamos en la Fase 7.4, pero de entrada. El
"Número" de la Hoja 1 es solo una clave temporal *dentro del archivo*
(no el `numero` real de la base, que se genera solo) para poder agrupar
las filas de la Hoja 2 con su solicitud. Más prolijo, pero requiere que
quien arma el Excel entienda que tiene que llenar 2 hojas coordinadas.

**Opción 2 — Una sola hoja plana (estilo Opción A del punto 7.4), agrupando filas consecutivas**
Una fila por empleado, con los datos de la solicitud repetidos — el import
agrupa filas consecutivas que comparten los mismos datos de cabecera
(área/sector/proceso/motivo/fechas) como si fueran la misma solicitud.
Más simple para quien carga el Excel (una sola hoja), pero más frágil de
parsear: hay que decidir un criterio exacto de "qué combinación de
columnas define que dos filas son la misma solicitud", y cualquier
typo/diferencia en una celda repetida (ej: un espacio de más en la fecha)
rompe silenciosamente el agrupamiento y separa lo que debería ser una
sola solicitud en dos.

**Mi recomendación:** Opción 1. Es más trabajo para quien arma el Excel,
pero muchísimo más robusto — no depende de heurísticas de agrupamiento
que pueden fallar en silencio, y es simétrico con lo que ya exportamos en
7.4 (quien exporta, corrige en Excel, y vuelve a importar, usa el mismo
formato ida y vuelta).

## Manejo de errores en un import de 2 niveles

A diferencia de los imports planos (donde "fila 5 falló" es suficiente
información), acá un error puede estar en la cabecera de la solicitud
(ej: motivo no encontrado — bloquea TODA esa solicitud, ningún empleado
se puede agregar) o en una fila de empleado puntual (ej: legajo no
encontrado — bloquea solo ese empleado, el resto de la solicitud puede
seguir). El resultado por fila tiene que distinguir estos dos niveles
para que el admin entienda qué corregir y dónde.

## Siguiente paso

Si confirmás que la Opción 1 (2 hojas, simétrica con la exportación de
7.4) es el formato que querés, lo implemento como una fase separada —
tiene entidad propia (nueva RPC, nuevo parser de 2 pasadas en el
frontend, UI de preview/resultado con los dos niveles de error). No lo
metí en esta entrega para no mezclar "análisis que pediste" con
"implementación que todavía no confirmaste".