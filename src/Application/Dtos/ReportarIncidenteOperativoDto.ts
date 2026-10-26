export interface ReportarIncidenteOperativoDto {
  busNumero: string
  motivo: string
  descripcion?: string
  fechaIncidente?: string // ISO
  replacementBusNumero?: string | null
  reportadoPor?: string | null
}
