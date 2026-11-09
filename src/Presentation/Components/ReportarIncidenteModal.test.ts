// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportarIncidenteModal from './ReportarIncidenteModal.vue'
import { obtenerFechaHoyLocal } from '../Composables/useIncidenteValidation'

const hoy = obtenerFechaHoyLocal()

const formularioBase = {
  busNumero: '25',
  motivo: 'AveriaMecanica',
  descripcion: '',
  fechaIncidente: hoy,
  replacementBusNumero: '',
  reportadoPor: 'admin@cooperativa.ec',
}

const motivos = [
  {
    value: 'AveriaMecanica',
    label: 'Avería Mecánica',
    descripcion: 'El bus no puede continuar en servicio.',
  },
  { value: 'Accidente', label: 'Accidente', descripcion: 'Requiere evaluación.' },
  { value: 'ReparacionProgramada', label: 'Reparación Programada', descripcion: '' },
  { value: 'Otro', label: 'Otro', descripcion: '' },
]

const busesReemplazo = [
  { numero: '30', placa: 'PBB-5678' },
  { numero: '31', placa: 'PBC-9012' },
]

function montarModal(props: Record<string, unknown> = {}) {
  return mount(ReportarIncidenteModal, {
    props: {
      modelValue: true,
      bus: { numero: '25', placa: 'PBA-1234', estado: 'Activo' },
      form: { ...formularioBase },
      motivos,
      busesReemplazo,
      loading: false,
      error: '',
      ...props,
    },
    global: {
      stubs: { teleport: true },
    },
  })
}

describe('ReportarIncidenteModal', () => {
  it('debe mostrar el bus afectado, el formulario y los motivos disponibles', () => {
    const wrapper = montarModal()

    expect(wrapper.text()).toContain('N.º 25 · PBA-1234')
    expect(wrapper.text()).toContain('Estado actual: Activo')
    expect((wrapper.find('#incidente-fecha').element as HTMLInputElement).value).toBe(hoy)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Avería Mecánica')
    expect(wrapper.text()).toContain('Reparación Programada')
  })

  it('debe restringir la fecha mínima a la fecha actual', () => {
    const wrapper = montarModal()
    const inputFecha = wrapper.find('#incidente-fecha')
    expect(inputFecha.attributes('min')).toBe(hoy)
  })

  it('debe bloquear el envío si la fecha del incidente es anterior a hoy', async () => {
    const wrapper = montarModal({
      form: { ...formularioBase, fechaIncidente: '2020-01-01' },
    })

    await wrapper.find('#form-reportar-incidente').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('La fecha del incidente no puede ser anterior a la fecha actual')
  })

  it('debe bloquear el envío si el motivo está vacío', async () => {
    const wrapper = montarModal({
      form: { ...formularioBase, motivo: '' },
    })

    await wrapper.find('#form-reportar-incidente').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Debes seleccionar el motivo del incidente')
  })

  it('debe emitir el motivo seleccionado y solicitar el autocompletado de la descripción', async () => {
    const wrapper = montarModal({
      form: { ...formularioBase, motivo: '' },
    })

    await wrapper.find('#incidente-motivo-AveriaMecanica').setValue(true)

    expect(wrapper.emitted('update:form')).toEqual([[{ motivo: 'AveriaMecanica' }]])
    expect(wrapper.emitted('select-motivo')).toEqual([['AveriaMecanica']])
  })

  it('debe emitir cambios de fecha, descripción y bus de reemplazo', async () => {
    const wrapper = montarModal()

    await wrapper.find('#incidente-fecha').setValue(hoy)
    await wrapper.find('#incidente-descripcion').setValue('Falla en el sistema de frenos.')
    await wrapper.find('#incidente-reemplazo').setValue('30')

    expect(wrapper.emitted('update:form')).toEqual([
      [{ fechaIncidente: hoy }],
      [{ descripcion: 'Falla en el sistema de frenos.' }],
      [{ replacementBusNumero: '30' }],
    ])
  })

  it('debe emitir submit al confirmar el reporte y close al cancelar', async () => {
    const wrapper = montarModal()

    await wrapper.find('#form-reportar-incidente').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)

    const cancelar = wrapper.findAll('button').find((boton) => boton.text() === 'Cancelar')
    await cancelar?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('debe mostrar el error del composable y deshabilitar las acciones mientras carga', () => {
    const wrapper = montarModal({ loading: true, error: 'Bus no encontrado' })

    expect(wrapper.text()).toContain('Bus no encontrado')
    expect(wrapper.find('#incidente-fecha').attributes('disabled')).toBeDefined()
    expect(wrapper.find('#incidente-descripcion').attributes('disabled')).toBeDefined()
    expect(wrapper.find('#incidente-reemplazo').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('debe cerrar desde el botón superior del ModalBase', async () => {
    const wrapper = montarModal()

    await wrapper.find('button[aria-label="Cerrar modal"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
