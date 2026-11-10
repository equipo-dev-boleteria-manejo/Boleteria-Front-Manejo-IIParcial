// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useIncidenteValidation, obtenerFechaHoyLocal } from './useIncidenteValidation'

describe('useIncidenteValidation', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('debe calcular la fecha mínima como la fecha actual en formato YYYY-MM-DD', () => {
    const { fechaMinima } = useIncidenteValidation()
    expect(fechaMinima.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(fechaMinima.value).toBe(obtenerFechaHoyLocal())
  })

  it('debe rechazar fechas pasadas y mostrar mensaje claro', () => {
    const { validarFecha, errorFecha } = useIncidenteValidation()

    const valida = validarFecha('2020-01-01')
    expect(valida).toBe(false)
    expect(errorFecha.value).toBe(
      'La fecha del incidente no puede ser anterior a la fecha actual',
    )
  })

  it('debe aceptar la fecha de hoy y fechas futuras', () => {
    const { validarFecha, errorFecha, fechaMinima } = useIncidenteValidation()

    expect(validarFecha(fechaMinima.value)).toBe(true)
    expect(errorFecha.value).toBe('')

    expect(validarFecha('2099-12-31')).toBe(true)
    expect(errorFecha.value).toBe('')
  })

  it('debe rechazar fechas vacías', () => {
    const { validarFecha, errorFecha } = useIncidenteValidation()

    expect(validarFecha('')).toBe(false)
    expect(errorFecha.value).toBe('La fecha del incidente es obligatoria')
  })

  it('debe rechazar motivos vacíos y aceptar motivos válidos', () => {
    const { validarMotivo, errorMotivo } = useIncidenteValidation()

    expect(validarMotivo('')).toBe(false)
    expect(errorMotivo.value).toBe('Debes seleccionar el motivo del incidente')

    expect(validarMotivo('AveriaMecanica')).toBe(true)
    expect(errorMotivo.value).toBe('')
  })

  it('debe validar el formulario completo correctamente', () => {
    const { validarFormulario, fechaMinima } = useIncidenteValidation()

    const formInvalido = {
      busNumero: '',
      motivo: '',
      fechaIncidente: '2020-01-01',
    }
    expect(validarFormulario(formInvalido)).toBe(false)

    const formValido = {
      busNumero: '25',
      motivo: 'AveriaMecanica',
      fechaIncidente: fechaMinima.value,
    }
    expect(validarFormulario(formValido)).toBe(true)
  })
})
