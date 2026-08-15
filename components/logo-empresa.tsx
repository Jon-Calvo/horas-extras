import { obtenerConfiguracionApariencia } from '@/lib/theme/obtener-configuracion-apariencia'
import { LogoEmpresaPresentacional } from './logo-empresa-presentacional'

type Tamano = 'sm' | 'md' | 'lg'
const PX: Record<Tamano, number> = { sm: 24, md: 32, lg: 48 }

// Para usar directo dentro de cualquier Server Component (login, páginas
// de admin, dashboard) sin tener que pasar la config a mano. Para usar
// dentro de un Client Component (como Sidebar), el padre Server Component
// debe resolver la config una vez y pasar logoUrl/nombreEmpresa como props
// planas hacia <LogoEmpresaPresentacional /> — ver components/sidebar.tsx.
export async function LogoEmpresa({
  tamano = 'md',
  variante = 'logo-y-nombre',
  className,
}: {
  tamano?: Tamano
  variante?: 'solo-logo' | 'logo-y-nombre'
  className?: string
}) {
  const config = await obtenerConfiguracionApariencia()

  return (
    <LogoEmpresaPresentacional
      logoUrl={config.logoUrl}
      nombreEmpresa={config.nombreEmpresa}
      tamano={PX[tamano]}
      mostrarNombre={variante === 'logo-y-nombre'}
      className={className}
    />
  )
}
