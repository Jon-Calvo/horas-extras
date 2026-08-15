// Único lugar donde viven los valores por defecto de apariencia (punto 12
// del pedido: "no quiero valores predeterminados repetidos en múltiples
// componentes"). La migración 0038 los redunda como DEFAULT de columna
// (para que la fila exista con algo sensato desde el insert inicial), pero
// la fuente de verdad para "Restaurar valores predeterminados" y para el
// fallback si por algún motivo no hay fila en la base es este archivo.

export const TOKENS_POR_DEFECTO = {
  nombreEmpresa: 'Horas Extras',
  temaPredeterminado: 'SISTEMA' as const,
  colorPrimario: '#2563EB',
  colorPrimarioHover: '#1D4ED8',
  colorSecundario: '#64748B',
  colorAcento: '#7C3AED',
  colorExito: '#16A34A',
  colorAdvertencia: '#D97706',
  colorError: '#DC2626',
}

// Estructurales (fondo/superficie/borde/texto): NO configurables por el
// admin — decisión de Fase A, Alternativa 1 (ver README-CONFIG-VISUAL-FASE-A.md,
// punto 2). Pares claro/oscuro fijos y balanceados, definidos una sola vez.
export const COLORES_ESTRUCTURALES = {
  claro: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
  },
  oscuro: {
    background: '#0F172A',
    surface: '#1E293B',
    border: '#334155',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
  },
} as const

export type PreferenciaTema = 'CLARO' | 'OSCURO' | 'SISTEMA'

export type ConfiguracionApariencia = {
  nombreEmpresa: string
  temaPredeterminado: PreferenciaTema
  colorPrimario: string
  colorPrimarioHover: string
  colorSecundario: string
  colorAcento: string
  colorExito: string
  colorAdvertencia: string
  colorError: string
  logoUrl: string | null
}

export const CONFIGURACION_APARIENCIA_POR_DEFECTO: ConfiguracionApariencia = {
  ...TOKENS_POR_DEFECTO,
  logoUrl: null,
}
