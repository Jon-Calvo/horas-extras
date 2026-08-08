'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { PanelOrganizacion, type ItemOrganizacion } from './panel-organizacion'
import { guardarArea, guardarProceso, guardarSector, toggleActivoArea, toggleActivoProceso, toggleActivoSector } from './actions'

export function OrganizacionMaestro({
  areas,
  sectores,
  procesos,
}: {
  areas: ItemOrganizacion[]
  sectores: ItemOrganizacion[]
  procesos: ItemOrganizacion[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const areaId = searchParams.get('area')
  const sectorId = searchParams.get('sector')

  function seleccionarArea(id: string) {
    const nuevoId = id === areaId ? null : id
    const qs = new URLSearchParams()
    if (nuevoId) qs.set('area', nuevoId)
    router.push(`/admin/organizacion?${qs.toString()}`)
  }

  function seleccionarSector(id: string) {
    const nuevoId = id === sectorId ? null : id
    const qs = new URLSearchParams()
    if (areaId) qs.set('area', areaId)
    if (nuevoId) qs.set('sector', nuevoId)
    router.push(`/admin/organizacion?${qs.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <PanelOrganizacion
        titulo="Áreas"
        items={areas}
        seleccionadoId={areaId}
        onSeleccionar={seleccionarArea}
        habilitadoParaAlta={true}
        onGuardar={guardarArea}
        onToggleActivo={toggleActivoArea}
      />

      <PanelOrganizacion
        titulo="Sectores"
        items={areaId ? sectores : []}
        seleccionadoId={sectorId}
        onSeleccionar={seleccionarSector}
        habilitadoParaAlta={Boolean(areaId)}
        mensajeSinHabilitar="Seleccioná un área a la izquierda"
        onGuardar={(id, nombre) => guardarSector(id, areaId!, nombre)}
        onToggleActivo={toggleActivoSector}
      />

      <PanelOrganizacion
        titulo="Procesos"
        items={sectorId ? procesos : []}
        seleccionadoId={null}
        habilitadoParaAlta={Boolean(sectorId)}
        mensajeSinHabilitar="Seleccioná un sector en el panel central"
        onGuardar={(id, nombre) => guardarProceso(id, sectorId!, nombre)}
        onToggleActivo={toggleActivoProceso}
      />
    </div>
  )
}