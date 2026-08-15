import { login } from './actions'
import { LogoEmpresa } from '@/components/logo-empresa'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        {/* Antes: <h1>Gestión de Horas Extras</h1> fijo. Ahora usa el logo
            y nombre configurados en /admin/apariencia — LogoEmpresa
            funciona acá sin sesión porque la RLS de 0038 da SELECT
            también a 'anon'. */}
        <LogoEmpresa tamano="lg" variante="logo-y-nombre" />

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {/* style inline con la variable CSS en vez de bg-primary: funciona
            ya mismo sin depender de que Tailwind ya esté configurado para
            reconocer esa utility (ver INTEGRACION.md) — una vez que
            registres bg-primary en globals.css/tailwind.config, se puede
            simplificar a className="bg-primary hover:bg-primary-hover". */}
        <button
          type="submit"
          style={{ backgroundColor: 'var(--color-primary)' }}
          className="w-full rounded px-3 py-2 text-sm font-medium text-white"
        >
          Ingresar
        </button>
      </form>
    </div>
  )
}
