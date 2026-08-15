'use client'

// Sin 'use client' esto también funcionaría en un Server Component, pero
// lo marco explícitamente como cliente porque su razón de existir es
// justamente poder usarse DENTRO de Sidebar (que es Client Component por
// el drawer de mobile) — un Server Component async como LogoEmpresa no se
// puede importar y renderizar desde adentro de un Client Component, solo
// pasarse como children/prop desde su padre. Esta pieza pura sí cruza esa
// frontera sin problema porque no hace ningún fetch, solo recibe datos ya
// resueltos.
export function LogoEmpresaPresentacional({
  logoUrl,
  nombreEmpresa,
  tamano = 32,
  mostrarNombre = true,
  className,
}: {
  logoUrl: string | null
  nombreEmpresa: string
  tamano?: number
  mostrarNombre?: boolean
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {logoUrl ? (
        // <img> nativo a propósito (no next/image): el logo viene de una
        // URL pública de Storage con dominio dinámico por proyecto, y acá
        // no vale la pena el pipeline de optimización de Next para un
        // ícono chico que ya se sirve optimizado desde el CDN de Supabase.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={nombreEmpresa} width={tamano} height={tamano} className="object-contain" />
      ) : (
        <div
          style={{ width: tamano, height: tamano, backgroundColor: 'var(--color-primary)' }}
          className="flex items-center justify-center rounded text-xs font-semibold text-white"
        >
          {nombreEmpresa.charAt(0).toUpperCase()}
        </div>
      )}
      {mostrarNombre && <span className="text-sm font-semibold">{nombreEmpresa}</span>}
    </div>
  )
}
