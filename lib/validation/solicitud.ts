import { z } from 'zod'

export const solicitudSchema = z
  .object({
    areaId: z.string().uuid('Seleccioná un área'),
    sectorId: z.string().uuid('Seleccioná un sector'),
    procesoId: z.string().uuid('Seleccioná un proceso'),
    fechaHoraInicio: z.string().min(1, 'Requerido'),
    fechaHoraFin: z.string().min(1, 'Requerido'),
    motivoId: z.string().uuid('Seleccioná un motivo'),
    observacion: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.fechaHoraFin) > new Date(data.fechaHoraInicio), {
    message: 'La fecha/hora de fin debe ser posterior a la de inicio',
    path: ['fechaHoraFin'],
  })

export type SolicitudFormValues = z.infer<typeof solicitudSchema>

