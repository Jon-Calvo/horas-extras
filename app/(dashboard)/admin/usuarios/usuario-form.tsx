'use client'

import { useActionState, useState } from 'react'
import { NIVEL_PERMISO } from '@/lib/enums'

const ROLES_DISPONIBLES = ['ADMIN', 'RESPONSABLE', 'APROBADOR', 'CONTROL_INGRESO', 'CONSULTA']
const NIVEL_LABEL: Record<string, string> = { TODO: 'Todo', AREA: 'Su área', SECTOR: 'Su sector', PROCESO: 'Su proceso', NADA: 'Nada' }

type Opciones = {
  areas: { id: string; nombre: string }[]
  sectores: { id: string; nombre: string; areaId: string }[]
  procesos: { id: string; nombre: string; sectorId: string }[]
}

type ValoresIniciales = {
  nombreCompleto: string
  email: string
  areaId: string
  sectorId: string
  procesoId: string
  roles: string[]
  permisos: {
    visibilidadNivel: string
    aprobacionNivel: string
    modificacionNivel: string
    reaperturaNivel: string
    controlIngreso: boolean
  }
}

// `action` es la referencia CRUDA de la Server Action (crearUsuario, o
// actualizarUsuario.bind(null, id) armado en la página padre) — nunca una
// arrow function que la envuelva (ver README-FASE5-2.md para el porqué).
export function UsuarioForm({
  opciones,
  valoresIniciales,
  modo,
  action,
}: {
  opciones: Opciones
  valoresIniciales: ValoresIniciales
  modo: 'crear' | 'editar'
  action: (prevState: { error: string }, formData: FormData) => Promise<{ error: string }>
}) {
  const [state, formAction, pending] = useActionState(action, { error: '' })

  // FIX Fase 5.3 (punto A): los tres selects ahora son COMPLETAMENTE
  // controlados (value + onChange, no defaultValue). Con `defaultValue`,
  // cuando la lista de opciones de un select dependiente cambiaba (por
  // ejemplo, se filtraban los sectores al cambiar de área), el navegador
  // podía quedar mostrando/enviando una opción que el usuario nunca eligió
  // — porque React no fuerza el valor seleccionado en un componente no
  // controlado después del montaje inicial. Al controlar los tres y
  // resetear TODOS los niveles dependientes en cada cambio (antes solo se
  // reseteaba un nivel), lo que se ve en pantalla y lo que se envía en el
  // FormData del submit son siempre exactamente lo mismo.
  const [areaId, setAreaId] = useState(valoresIniciales.areaId)
  const [sectorId, setSectorId] = useState(valoresIniciales.sectorId)
  const [procesoId, setProcesoId] = useState(valoresIniciales.procesoId)

  const sectoresFiltrados = opciones.sectores.filter((s) => !areaId || s.areaId === areaId)
  const procesosFiltrados = opciones.procesos.filter((p) => !sectorId || p.sectorId === sectorId)

  function onCambiarArea(nuevoAreaId: string) {
    setAreaId(nuevoAreaId)
    setSectorId('')   // el sector ya no es válido para la nueva área
    setProcesoId('')  // y el proceso dependía del sector anterior
  }

  function onCambiarSector(nuevoSectorId: string) {
    setSectorId(nuevoSectorId)
    setProcesoId('')  // el proceso ya no es válido para el nuevo sector
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-6">
      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre completo</label>
          <input type="text" name="nombreCompleto" defaultValue={valoresIniciales.nombreCompleto} className="w-full rounded border border-border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={valoresIniciales.email}
            disabled={modo === 'editar'}
            className="w-full rounded border border-border px-3 py-2 text-sm disabled:bg-background disabled:text-text-muted"
          />
          {modo === 'editar' && <p className="text-xs text-text-muted">El email no se puede cambiar desde acá.</p>}
        </div>
      </div>

      {modo === 'crear' && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Contraseña inicial</label>
          <input type="text" name="passwordInicial" className="w-full rounded border border-border px-3 py-2 text-sm" placeholder="Mínimo 8 caracteres" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Área</label>
          <select name="areaId" value={areaId} onChange={(e) => onCambiarArea(e.target.value)} className="w-full rounded border border-border px-2 py-1.5 text-sm">
            <option value="">Sin especificar</option>
            {opciones.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Sector</label>
          <select name="sectorId" value={sectorId} onChange={(e) => onCambiarSector(e.target.value)} className="w-full rounded border border-border px-2 py-1.5 text-sm" disabled={!areaId}>
            <option value="">Sin especificar</option>
            {sectoresFiltrados.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Proceso</label>
          <select name="procesoId" value={procesoId} onChange={(e) => setProcesoId(e.target.value)} className="w-full rounded border border-border px-2 py-1.5 text-sm" disabled={!sectorId}>
            <option value="">Sin especificar</option>
            {procesosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Roles</label>
        <div className="flex flex-wrap gap-3">
          {ROLES_DISPONIBLES.map((rol) => (
            <label key={rol} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="roles" value={rol} defaultChecked={valoresIniciales.roles.includes(rol)} />
              {rol}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded border border-border p-3">
        <p className="text-sm font-medium">Permisos de scope</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ['visibilidadNivel', 'Visibilidad', valoresIniciales.permisos.visibilidadNivel],
              ['aprobacionNivel', 'Aprobación', valoresIniciales.permisos.aprobacionNivel],
              ['modificacionNivel', 'Modificación', valoresIniciales.permisos.modificacionNivel],
              ['reaperturaNivel', 'Reapertura', valoresIniciales.permisos.reaperturaNivel],
            ] as const
          ).map(([name, label, defaultValue]) => (
            <div key={name} className="space-y-1">
              <label className="text-xs font-medium text-text-muted">{label}</label>
              <select name={name} defaultValue={defaultValue} className="w-full rounded border border-border px-2 py-1.5 text-sm">
                {NIVEL_PERMISO.map((n) => (
                  <option key={n} value={n}>
                    {NIVEL_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="controlIngreso" defaultChecked={valoresIniciales.permisos.controlIngreso} />
          Puede registrar control de ingreso
        </label>
      </div>

      <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando...' : modo === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
      </button>
    </form>
  )
}
