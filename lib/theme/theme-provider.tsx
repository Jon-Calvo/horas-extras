'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { PreferenciaTema } from './tokens'

const NOMBRE_COOKIE = 'tema-usuario'

type ThemeContextValue = {
  preferencia: PreferenciaTema
  setPreferencia: (p: PreferenciaTema) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// `preferenciaInicial` viene resuelta del servidor (resolver-tema.ts) —
// evita un segundo cálculo/parpadeo en el primer render del cliente.
export function ThemeProvider({
  preferenciaInicial,
  children,
}: {
  preferenciaInicial: PreferenciaTema
  children: React.ReactNode
}) {
  const [preferencia, setPreferenciaState] = useState<PreferenciaTema>(preferenciaInicial)

  useEffect(() => {
    aplicarClaseDark(preferencia)

    if (preferencia !== 'SISTEMA') return

    // Si el usuario elige "Sistema", seguimos escuchando cambios de
    // preferencia del SO en vivo (ej: se activa el modo oscuro automático
    // del sistema operativo a la tardecita) sin que haga falta recargar.
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => aplicarClaseDark('SISTEMA')
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [preferencia])

  function setPreferencia(nueva: PreferenciaTema) {
    setPreferenciaState(nueva)
    document.cookie = `${NOMBRE_COOKIE}=${nueva}; path=/; max-age=31536000; SameSite=Lax`
  }

  return <ThemeContext.Provider value={{ preferencia, setPreferencia }}>{children}</ThemeContext.Provider>
}

function aplicarClaseDark(preferencia: PreferenciaTema) {
  const esOscuro =
    preferencia === 'OSCURO' || (preferencia === 'SISTEMA' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', esOscuro)
}

export function useTheme() {
  const contexto = useContext(ThemeContext)
  if (!contexto) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  }
  return contexto
}
