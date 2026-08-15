import { cookies } from 'next/headers'
import type { PreferenciaTema } from './tokens'

const NOMBRE_COOKIE = 'tema-usuario'

// La preferencia de tema es PERSONAL (cualquier usuario, no solo admin —
// ver README-CONFIG-VISUAL-FASE-A.md punto 6). Vive en una cookie, no en
// la tabla de configuración global, así el servidor puede leerla y aplicar
// la clase `dark` antes del primer paint (sin el parpadeo de "carga claro,
// después salta a oscuro").
export async function resolverTemaUsuario(
  temaPredeterminadoEmpresa: PreferenciaTema
): Promise<{ preferencia: PreferenciaTema; resueltoOscuro: boolean }> {
  const store = await cookies()
  const valorCookie = store.get(NOMBRE_COOKIE)?.value as PreferenciaTema | undefined
  const preferencia = valorCookie ?? temaPredeterminadoEmpresa

  if (preferencia === 'OSCURO') return { preferencia, resueltoOscuro: true }
  if (preferencia === 'CLARO') return { preferencia, resueltoOscuro: false }

  // 'SISTEMA': el servidor no puede saber la preferencia del SO — se
  // asume claro en el primer paint SSR y el script de NoFlashThemeScript
  // lo corrige de forma síncrona antes de que el usuario vea nada, si
  // corresponde.
  return { preferencia: 'SISTEMA', resueltoOscuro: false }
}

export { NOMBRE_COOKIE }
