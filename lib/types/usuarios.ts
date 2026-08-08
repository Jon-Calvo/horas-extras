// Tipos para las queries que traen usuario_roles con el nombre del rol vía
// join (`.select('roles(nombre)')`). PostgREST devuelve la relación N-a-1
// (usuario_roles.rol_id → roles.id) como un objeto anidado, no un array —
// por eso `roles` es un objeto y no `roles: {...}[]`.
export type UsuarioRolConNombre = {
  roles: { nombre: string } | null
}

export function extraerNombresDeRoles(filas: UsuarioRolConNombre[]): string[] {
  return filas.map((f) => f.roles?.nombre).filter((nombre): nombre is string => Boolean(nombre))
}