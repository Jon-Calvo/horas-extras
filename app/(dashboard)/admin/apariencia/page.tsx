import { obtenerConfiguracionApariencia } from '@/lib/theme/obtener-configuracion-apariencia'
import { AparienciaForm } from './apariencia-form'

export default async function AparienciaPage() {
  const config = await obtenerConfiguracionApariencia()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Configuración de apariencia</h1>
        <p className="text-sm text-text-muted">Personalizá la identidad visual del sistema — los cambios se aplican a todos los usuarios.</p>
      </div>
      <AparienciaForm
        inicial={{
          nombreEmpresa: config.nombreEmpresa,
          temaPredeterminado: config.temaPredeterminado,
          colorPrimario: config.colorPrimario,
          colorPrimarioHover: config.colorPrimarioHover,
          colorSecundario: config.colorSecundario,
          colorAcento: config.colorAcento,
          colorExito: config.colorExito,
          colorAdvertencia: config.colorAdvertencia,
          colorError: config.colorError,
        }}
        logoUrlInicial={config.logoUrl}
      />
    </div>
  )
}
