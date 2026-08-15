'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ColorPickerHex } from '@/components/color-picker-hex'
import { TOKENS_POR_DEFECTO, type PreferenciaTema } from '@/lib/theme/tokens'
import { VistaPrevia } from './vista-previa'
import { actualizarApariencia, eliminarLogo, restaurarApariencia, subirLogo, type ValoresApariencia } from './actions'

const OPCIONES_TEMA: { valor: PreferenciaTema; label: string }[] = [
  { valor: 'CLARO', label: 'Claro' },
  { valor: 'OSCURO', label: 'Oscuro' },
  { valor: 'SISTEMA', label: 'Sistema' },
]

// Nota de diseño (no es el patrón <form action> que usamos en el resto del
// proyecto, y es intencional): acá necesitamos que CADA cambio de color
// actualice la vista previa al instante, así que el estado tiene que vivir
// en React (controlado), no en el DOM de un form nativo. Las Server
// Actions se llaman DIRECTO desde los handlers (mismo patrón ya usado en
// AccionesCuenta de usuarios) — nunca se pasan como prop envueltas en una
// arrow function, así que no cae en el bug de Fase 5.2.
export function AparienciaForm({ inicial, logoUrlInicial }: { inicial: ValoresApariencia; logoUrlInicial: string | null }) {
  const [valores, setValores] = useState<ValoresApariencia>(inicial)
  const [logoUrl, setLogoUrl] = useState(logoUrlInicial)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()
  const [pendingLogo, startLogoTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  function cambiarCampo<K extends keyof ValoresApariencia>(campo: K, valor: ValoresApariencia[K]) {
    setValores((v) => ({ ...v, [campo]: valor }))
  }

  function guardar() {
    startTransition(async () => {
      const result = await actualizarApariencia(valores)
      setMensaje(
        result.error ? { tipo: 'error', texto: result.error } : { tipo: 'ok', texto: 'Guardado — ya es visible para todos los usuarios.' }
      )
      if (!result.error) router.refresh()
    })
  }

  function cancelar() {
    setValores(inicial)
    setMensaje(null)
  }

  function restaurar() {
    if (
      !confirm(
        '¿Restaurar la configuración visual predeterminada? Esto reemplaza los colores, el tema y el nombre actuales. El logo no se borra (usá "Eliminar logo" aparte si también lo querés sacar).'
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await restaurarApariencia()
      if (result.error) {
        setMensaje({ tipo: 'error', texto: result.error })
        return
      }
      setValores({
        nombreEmpresa: TOKENS_POR_DEFECTO.nombreEmpresa,
        temaPredeterminado: TOKENS_POR_DEFECTO.temaPredeterminado,
        colorPrimario: TOKENS_POR_DEFECTO.colorPrimario,
        colorPrimarioHover: TOKENS_POR_DEFECTO.colorPrimarioHover,
        colorSecundario: TOKENS_POR_DEFECTO.colorSecundario,
        colorAcento: TOKENS_POR_DEFECTO.colorAcento,
        colorExito: TOKENS_POR_DEFECTO.colorExito,
        colorAdvertencia: TOKENS_POR_DEFECTO.colorAdvertencia,
        colorError: TOKENS_POR_DEFECTO.colorError,
      })
      setMensaje({ tipo: 'ok', texto: 'Configuración restaurada.' })
      router.refresh()
    })
  }

  function subirArchivo() {
    if (!archivoSeleccionado) return
    startLogoTransition(async () => {
      const formData = new FormData()
      formData.set('archivo', archivoSeleccionado)
      const result = await subirLogo(formData)
      if (result.error) {
        setMensaje({ tipo: 'error', texto: result.error })
        return
      }
      setMensaje({ tipo: 'ok', texto: 'Logo actualizado.' })
      setLogoUrl(URL.createObjectURL(archivoSeleccionado)) // feedback inmediato mientras llega la URL real del storage
      setArchivoSeleccionado(null)
      router.refresh()
    })
  }

  function quitarLogo() {
    if (!confirm('¿Eliminar el logo actual?')) return
    startLogoTransition(async () => {
      const result = await eliminarLogo()
      if (result.error) {
        setMensaje({ tipo: 'error', texto: result.error })
        return
      }
      setLogoUrl(null)
      setMensaje({ tipo: 'ok', texto: 'Logo eliminado.' })
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {mensaje && (
          <p className={`rounded px-3 py-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {mensaje.texto}
          </p>
        )}

        <section className="space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">Tema</h2>
          <div className="flex gap-2">
            {OPCIONES_TEMA.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => cambiarCampo('temaPredeterminado', o.valor)}
                className={`rounded px-3 py-1.5 text-sm ${
                  valores.temaPredeterminado === o.valor ? 'bg-slate-900 text-white' : 'border text-slate-600 hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Es el tema por defecto para usuarios nuevos — cada usuario puede después elegir el suyo propio desde la sidebar, sin
            necesitar permisos de admin.
          </p>
        </section>

        <section className="space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">Identidad</h2>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Logo de la empresa</label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo actual" className="h-12 w-12 rounded border object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded border text-xs text-slate-400">Sin logo</div>
              )}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] ?? null)}
                  className="block text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={subirArchivo}
                    disabled={!archivoSeleccionado || pendingLogo}
                    className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                  >
                    {pendingLogo ? 'Subiendo...' : 'Seleccionar imagen'}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={quitarLogo}
                      disabled={pendingLogo}
                      className="rounded border px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                    >
                      Eliminar logo
                    </button>
                  )}
                </div>
                {archivoSeleccionado && <p className="text-xs text-slate-400">{archivoSeleccionado.name}</p>}
              </div>
            </div>
            <p className="text-xs text-slate-400">PNG, JPG, WEBP o SVG — máximo 5 MB.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Nombre de la empresa</label>
            <input
              type="text"
              value={valores.nombreEmpresa}
              onChange={(e) => cambiarCampo('nombreEmpresa', e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">Colores</h2>
          <div className="grid grid-cols-2 gap-3">
            <ColorPickerHex label="Primario" value={valores.colorPrimario} onChange={(v) => cambiarCampo('colorPrimario', v)} />
            <ColorPickerHex label="Primario (hover)" value={valores.colorPrimarioHover} onChange={(v) => cambiarCampo('colorPrimarioHover', v)} />
            <ColorPickerHex label="Secundario" value={valores.colorSecundario} onChange={(v) => cambiarCampo('colorSecundario', v)} />
            <ColorPickerHex label="Acento" value={valores.colorAcento} onChange={(v) => cambiarCampo('colorAcento', v)} />
            <ColorPickerHex label="Éxito" value={valores.colorExito} onChange={(v) => cambiarCampo('colorExito', v)} />
            <ColorPickerHex label="Advertencia" value={valores.colorAdvertencia} onChange={(v) => cambiarCampo('colorAdvertencia', v)} />
            <ColorPickerHex label="Error" value={valores.colorError} onChange={(v) => cambiarCampo('colorError', v)} />
          </div>
          <p className="text-xs text-slate-400">
            Fondo, superficie, texto y bordes no se configuran acá a propósito — el sistema define pares claro/oscuro ya
            balanceados para garantizar contraste legible (ver README-CONFIG-VISUAL-FASE-A.md, punto 2).
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          <button onClick={guardar} disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button onClick={cancelar} disabled={pending} className="rounded border px-4 py-2 text-sm disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={restaurar}
            disabled={pending}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50 lg:ml-auto"
          >
            Restaurar valores predeterminados
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Vista previa</h2>
        <VistaPrevia valores={valores} logoUrl={logoUrl} />
      </div>
    </div>
  )
}
