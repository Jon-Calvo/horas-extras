import { logout } from '../login/actions'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { obtenerConfiguracionApariencia } from '@/lib/theme/obtener-configuracion-apariencia'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [{ data: esAdmin }, config] = await Promise.all([supabase.rpc('fn_es_admin'), obtenerConfiguracionApariencia()])

  const logoutForm = (
    <form action={logout}>
      <button type="submit" className="text-slate-500 underline">
        Salir
      </button>
    </form>
  )

  return (
    <div className="flex min-h-screen bg-background text-text md:flex-row flex-col">
      <Sidebar
        userEmail={user?.email}
        esAdmin={Boolean(esAdmin)}
        logoUrl={config.logoUrl}
        nombreEmpresa={config.nombreEmpresa}
        logoutForm={logoutForm}
      />
      <main className="flex-1 p-6 text-text">{children}</main>
    </div>
  )
}