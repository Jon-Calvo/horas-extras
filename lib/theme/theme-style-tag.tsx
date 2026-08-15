import { construirVariablesCss } from './aplicar-variables'
import type { ConfiguracionApariencia } from './tokens'

// Se renderiza en el <head> del layout raíz. Los valores de MARCA
// (primario/secundario/acento/éxito/advertencia/error) son los mismos en
// :root y en .dark (colores de marca no cambian con el modo — ver
// análisis); los ESTRUCTURALES (fondo/superficie/texto/borde) sí difieren
// entre los dos bloques.
export function ThemeStyleTag({ config }: { config: ConfiguracionApariencia }) {
  const variablesClaro = construirVariablesCss(config, false)
  const variablesOscuro = construirVariablesCss(config, true)

  const bloqueClaro = Object.entries(variablesClaro)
    .map(([nombre, valor]) => `${nombre}: ${valor};`)
    .join(' ')
  const bloqueOscuro = Object.entries(variablesOscuro)
    .map(([nombre, valor]) => `${nombre}: ${valor};`)
    .join(' ')

  const css = `:root { ${bloqueClaro} } .dark { ${bloqueOscuro} }`

  // eslint-disable-next-line react/no-danger
  return <style id="theme-vars" dangerouslySetInnerHTML={{ __html: css }} />
}
