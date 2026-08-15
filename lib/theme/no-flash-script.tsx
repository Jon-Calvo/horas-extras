import type { PreferenciaTema } from './tokens'

// Se renderiza en el <head>, ANTES del contenido — un script bloqueante e
// inline (no un archivo .js externo, que llegaría tarde) que decide si hay
// que agregar la clase `dark` al <html> antes de que el navegador pinte
// nada. Solo hace falta cuando la preferencia es 'SISTEMA': si es 'CLARO'
// u 'OSCURO' explícito, el servidor ya lo resolvió (resolver-tema.ts) y no
// hace falta ningún ajuste del lado del cliente.
export function NoFlashThemeScript({ temaPredeterminadoEmpresa }: { temaPredeterminadoEmpresa: PreferenciaTema }) {
  const codigo = `
(function () {
  try {
    var match = document.cookie.match(/tema-usuario=([^;]+)/);
    var pref = match ? match[1] : ${JSON.stringify(temaPredeterminadoEmpresa)};
    if (pref === 'OSCURO') {
      document.documentElement.classList.add('dark');
    } else if (pref === 'SISTEMA' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`.trim()

  // eslint-disable-next-line react/no-danger
  return <script id="no-flash-theme" dangerouslySetInnerHTML={{ __html: codigo }} />
}
