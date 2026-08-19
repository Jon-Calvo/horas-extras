import {
  COLORES_ESTRUCTURALES,
  type ConfiguracionApariencia,
} from './tokens'

// Un solo lugar que decide qué variable CSS corresponde a qué valor.
// Tanto ThemeStyleTag (SSR) como cualquier otro consumidor futuro llaman
// acá en vez de armar el objeto a mano cada vez.
export function construirVariablesCss(
  config: ConfiguracionApariencia,
  modoOscuro: boolean
): Record<string, string> {
  const estructurales = modoOscuro
    ? COLORES_ESTRUCTURALES.oscuro
    : COLORES_ESTRUCTURALES.claro

  return {
    // Colores de marca: iguales en claro y oscuro.
    '--app-primary': config.colorPrimario,
    '--app-primary-hover': config.colorPrimarioHover,
    '--app-secondary': config.colorSecundario,
    '--app-accent': config.colorAcento,
    '--app-success': config.colorExito,
    '--app-warning': config.colorAdvertencia,
    '--app-danger': config.colorError,

    // Colores estructurales: cambian según el tema.
    '--app-background': estructurales.background,
    '--app-surface': estructurales.surface,
    '--app-border border-border': estructurales.border,
    '--app-text': estructurales.text,
    '--app-text-muted': estructurales.textMuted,
  }
}
