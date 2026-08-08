import { logout } from '../login/actions'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: esAdmin } = await supabase.rpc('fn_es_admin')

  const logoutForm = (
    <form action={logout}>
      <button type="submit" className="text-slate-500 underline">
        Salir
      </button>
    </form>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 md:flex-row flex-col">
      <Sidebar
        userEmail={user?.email}
        esAdmin={Boolean(esAdmin)}
        logoutForm={logoutForm}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}