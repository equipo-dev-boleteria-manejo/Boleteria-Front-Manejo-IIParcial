/**
 * useIncidenteValidation.ts
 *
 * Composable desacoplado (Headless) para la validación del formulario de reporte de incidentes.
 * Regla de negocio:
 * - Los reportes de incidentes solo pueden registrarse desde la fecha actual en adelante.
 * - No se admiten fechas pasadas.
 * - El motivo y el bus son campos estrictamente requeridos.
 */

import { ref, computed } from 'vue'

export interface FormIncidenteValidable {
  busNumero: string
  motivo: string
  fechaIncidente: string
  descripcion?: string
}

export function obtenerFechaHoyLocal(): string {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useIncidenteValidation() {
  const errorFecha = ref('')
  const errorMotivo = ref('')
  const errorBus = ref('')

  const fechaMinima = computed(() => obtenerFechaHoyLocal())

  function validarFecha(fecha: string): boolean {
    const valor = String(fecha || '').trim()
    if (!valor) {
      errorFecha.value = 'La fecha del incidente es obligatoria'
      return false
    }

    const hoy = fechaMinima.value
    if (valor < hoy) {
      errorFecha.value = 'La fecha del incidente no puede ser anterior a la fecha actual'
      return false
    }

    errorFecha.value = ''
    return true
  }

  function validarMotivo(motivo: string): boolean {
    const valor = String(motivo || '').trim()
    if (!valor) {
      errorMotivo.value = 'Debes seleccionar el motivo del incidente'
      return false
    }

    errorMotivo.value = ''
    return true
  }

  function validarBus(busNumero: string): boolean {
    const valor = String(busNumero || '').trim()
    if (!valor) {
      errorBus.value = 'El número de bus es obligatorio'
      return false
    }

    errorBus.value = ''
    return true
  }

  function validarFormulario(form: FormIncidenteValidable): boolean {
    const fechaOk = validarFecha(form.fechaIncidente)
    const motivoOk = validarMotivo(form.motivo)
    const busOk = validarBus(form.busNumero)

    return fechaOk && motivoOk && busOk
  }

  function resetErrores() {
    errorFecha.value = ''
    errorMotivo.value = ''
    errorBus.value = ''
  }

  return {
    errorFecha,
    errorMotivo,
    errorBus,
    fechaMinima,
    validarFecha,
    validarMotivo,
    validarBus,
    validarFormulario,
    resetErrores,
    obtenerFechaHoyLocal,
  }
}
