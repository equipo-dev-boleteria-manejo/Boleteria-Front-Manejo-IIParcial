// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { Bus } from '../../../Domain/Entities/Bus'
import { EstadoBus } from '../../../Domain/Constants/EstadosSistema'
import BusesAdmin from './BusesAdmin.vue'
import { useBuses } from '../../Composables/useBuses'
import { useControlBuses } from '../../Composables/useControlBuses'
import { useReportarIncidente } from '../../Composables/useReportarIncidente'

const uiMocks = vi.hoisted(() => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn(),
}))

vi.mock('../../Store/uiStore', () => ({
  useUiStore: () => uiMocks,
}))

vi.mock('../../Store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'admin-1',
      email: 'admin@cooperativa.ec',
      cooperativaId: 2,
    },
  }),
}))

vi.mock('../../Composables/useBuses', () => ({
  useBuses: vi.fn(),
}))

vi.mock('../../Composables/useControlBuses', () => ({
  useControlBuses: vi.fn(),
}))

vi.mock('../../Composables/useReportarIncidente', () => ({
  useReportarIncidente: vi.fn(),
}))

const EditarBusModalStub = defineComponent({
  name: 'EditarBusModal',
  props: {
    modelValue: Boolean,
    bus: Object,
    loading: Boolean,
    error: String,
  },
  emits: ['update:modelValue', 'close', 'save'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-test': 'editar-modal' }, [
        h('span', { 'data-test': 'editar-numero' }, (props.bus as Bus | null)?.numero ?? ''),
        h(
          'button',
          {
            'data-test': 'editar-save',
            onClick: () =>
              emit('save', {
                id: 5,
                numero: '25',
                placa: 'PBA-1234',
                totalAsientos: 45,
                estructura: 'DosPisos',
              }),
          },
          'Guardar cambios',
        ),
        h(
          'button',
          {
            'data-test': 'editar-close',
            onClick: () => emit('close'),
          },
          'Cerrar edición',
        ),
      ])
  },
})

const ReportarIncidenteModalStub = defineComponent({
  name: 'ReportarIncidenteModal',
  props: {
    modelValue: Boolean,
    bus: Object,
    form: Object,
    motivos: Array,
    busesReemplazo: Array,
    loading: Boolean,
    error: String,
  },
  emits: ['update:modelValue', 'update:form', 'select-motivo', 'submit', 'close'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-test': 'reporte-modal' }, [
        h('span', { 'data-test': 'reporte-numero' }, (props.bus as Bus | null)?.numero ?? ''),
        h(
          'button',
          {
            'data-test': 'reporte-select-motivo',
            onClick: () => {
              emit('update:form', { motivo: 'Accidente' })
              emit('select-motivo', 'Accidente')
            },
          },
          'Seleccionar motivo',
        ),
        h(
          'button',
          {
            'data-test': 'reporte-submit',
            onClick: () => emit('submit'),
          },
          'Reportar incidente',
        ),
        h(
          'button',
          {
            'data-test': 'reporte-close',
            onClick: () => emit('close'),
          },
          'Cerrar reporte',
        ),
      ])
  },
})

function crearBus(
  numero: string,
  placa: string,
  id: number,
  estado: EstadoBus = EstadoBus.ACTIVO,
) {
  const bus = new Bus(2, numero, placa, 40, estado)
  bus.id = id
  return bus
}

function crearEstado() {
  const buses = ref<Bus[]>([])
  const nuevoBus = ref({
    cooperativaId: 1,
    numero: '',
    placa: '',
    totalAsientos: 40,
    estructura: 'UnPiso' as 'UnPiso' | 'DosPisos',
  })
  const busesLoading = ref(false)
  const busesError = ref('')
  const cargarBuses = vi.fn().mockResolvedValue(undefined)
  const registrarBus = vi.fn().mockResolvedValue(true)
  const guardarBus = vi.fn().mockResolvedValue(true)
  const limpiarError = vi.fn(() => {
    busesError.value = ''
  })

  const busesDisponibles = ref<Bus[]>([])
  const controlLoading = ref(false)
  const controlError = ref('')
  const controlSuccess = ref('')
  const cargarBusesActivos = vi.fn().mockResolvedValue([])
  const activarBus = vi.fn().mockResolvedValue(null)
  const desactivarBus = vi.fn().mockResolvedValue(null)
  const reactivarBus = vi.fn().mockResolvedValue(null)
  const limpiarMensajes = vi.fn(() => {
    controlError.value = ''
    controlSuccess.value = ''
  })

  const formIncidente = reactive({
    busNumero: '',
    motivo: '',
    descripcion: '',
    fechaIncidente: '2026-10-27',
    replacementBusNumero: '',
    reportadoPor: '',
  })
  const motivosCatalogo = [
    { value: 'AveriaMecanica', label: 'Avería Mecánica', descripcion: 'Falla mecánica.' },
    { value: 'Accidente', label: 'Accidente', descripcion: 'Accidente de tránsito.' },
    { value: 'ReparacionProgramada', label: 'Reparación Programada', descripcion: '' },
    { value: 'Otro', label: 'Otro', descripcion: '' },
  ]
  const seleccionarMotivo = vi.fn((motivo: string) => {
    formIncidente.motivo = motivo
  })
  const reporteLoading = ref(false)
  const reporteError = ref('')
  const reporteSuccess = ref(false)
  const responseData = ref<{ acciones: { mensaje: string } } | null>(null)
  const reportarIncidente = vi.fn().mockResolvedValue(undefined)
  const reiniciarReporte = vi.fn(() => {
    formIncidente.busNumero = ''
    formIncidente.motivo = ''
    formIncidente.descripcion = ''
    formIncidente.replacementBusNumero = ''
    formIncidente.reportadoPor = ''
    reporteError.value = ''
    reporteSuccess.value = false
    responseData.value = null
  })

  return {
    buses,
    nuevoBus,
    busesLoading,
    busesError,
    cargarBuses,
    registrarBus,
    guardarBus,
    limpiarError,
    busesDisponibles,
    controlLoading,
    controlError,
    controlSuccess,
    cargarBusesActivos,
    activarBus,
    desactivarBus,
    reactivarBus,
    limpiarMensajes,
    formIncidente,
    motivosCatalogo,
    seleccionarMotivo,
    reporteLoading,
    reporteError,
    reporteSuccess,
    responseData,
    reportarIncidente,
    reiniciarReporte,
  }
}

let estado: ReturnType<typeof crearEstado>

function conectarMocks() {
  vi.mocked(useBuses).mockReturnValue({
    buses: estado.buses,
    nuevoBus: estado.nuevoBus,
    loading: estado.busesLoading,
    error: estado.busesError,
    cargarBuses: estado.cargarBuses,
    registrarBus: estado.registrarBus,
    guardarBus: estado.guardarBus,
    reportarIncidenteYRefrescar: vi.fn(),
    limpiarError: estado.limpiarError,
  } as never)

  vi.mocked(useControlBuses).mockReturnValue({
    buses: estado.busesDisponibles,
    loading: estado.controlLoading,
    error: estado.controlError,
    success: estado.controlSuccess,
    cargarBusesActivos: estado.cargarBusesActivos,
    crearBus: vi.fn(),
    reactivarBus: estado.reactivarBus,
    activarBus: estado.activarBus,
    desactivarBus: estado.desactivarBus,
    liberarBus: vi.fn(),
    limpiarMensajes: estado.limpiarMensajes,
  } as never)

  vi.mocked(useReportarIncidente).mockReturnValue({
    formIncidente: estado.formIncidente,
    motivosCatalogo: estado.motivosCatalogo,
    seleccionarMotivo: estado.seleccionarMotivo,
    loading: estado.reporteLoading,
    error: estado.reporteError,
    success: estado.reporteSuccess,
    responseData: estado.responseData,
    reportarIncidente: estado.reportarIncidente,
    reactivarBusOperativo: vi.fn(),
    limpiarFormulario: vi.fn(),
    reiniciarReporte: estado.reiniciarReporte,
  } as never)
}

function montarVista() {
  return mount(BusesAdmin, {
    global: {
      stubs: {
        EditarBusModal: EditarBusModalStub,
        ReportarIncidenteModal: ReportarIncidenteModalStub,
      },
    },
  })
}

function buscarBoton(wrapper: ReturnType<typeof montarVista>, texto: string) {
  return wrapper.findAll('button').find((boton) => boton.text() === texto)
}

beforeEach(() => {
  uiMocks.showAlert.mockReset()
  uiMocks.showConfirm.mockReset()
  uiMocks.showConfirm.mockResolvedValue(true)

  vi.mocked(useBuses).mockReset()
  vi.mocked(useControlBuses).mockReset()
  vi.mocked(useReportarIncidente).mockReset()

  estado = crearEstado()
  conectarMocks()
})

describe('BusesAdmin', () => {
  it('debe solicitar los buses activos al montar la vista', async () => {
    montarVista()
    await flushPromises()

    expect(estado.cargarBusesActivos).toHaveBeenCalledTimes(1)
  })

  it('debe mostrar el estado de carga sin datos', () => {
    estado.busesLoading.value = true
    const wrapper = montarVista()

    expect(wrapper.find('[aria-label="Cargando catálogo de buses"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cargando buses...')
  })

  it('debe mostrar el estado vacío cuando no existen buses', () => {
    const wrapper = montarVista()

    expect(wrapper.text()).toContain('No hay buses registrados')
    expect(buscarBoton(wrapper, 'Registrar primer bus')).toBeDefined()
  })

  it('debe mostrar el error global y el estado de error sin datos', () => {
    estado.busesError.value = 'Sin conexión con el servidor'
    const wrapper = montarVista()

    expect(wrapper.text()).toContain('No se pudo completar la operación')
    expect(wrapper.text()).toContain('Sin conexión con el servidor')
    expect(wrapper.text()).toContain('No pudimos cargar la flota')
  })

  it('debe renderizar la tabla con los datos provenientes de useBuses', () => {
    estado.buses.value = [crearBus('25', 'PBA-1234', 5)]
    const wrapper = montarVista()

    expect(wrapper.text()).toContain('Bus 25')
    expect(wrapper.text()).toContain('PBA-1234')
    expect(wrapper.text()).toContain('40')
    expect(wrapper.text()).toContain('Un piso')
    expect(wrapper.text()).toContain('Activo')
  })

  it('debe abrir el modal de edición con el bus seleccionado', async () => {
    const bus = crearBus('25', 'PBA-1234', 5)
    estado.buses.value = [bus]
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Editar')?.trigger('click')

    const modal = wrapper.findComponent({ name: 'EditarBusModal' })
    expect(modal.props('modelValue')).toBe(true)
    expect(modal.props('bus')).toMatchObject({ numero: '25', placa: 'PBA-1234' })
  })

  it('debe guardar el bus editado y notificar el éxito', async () => {
    estado.buses.value = [crearBus('25', 'PBA-1234', 5)]
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Editar')?.trigger('click')
    await wrapper.find('[data-test="editar-save"]').trigger('click')
    await flushPromises()

    expect(estado.guardarBus).toHaveBeenCalledWith({
      id: 5,
      numero: '25',
      placa: 'PBA-1234',
      totalAsientos: 45,
      estructura: 'DosPisos',
    })
    expect(uiMocks.showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Bus actualizado' }),
    )
    expect(wrapper.findComponent({ name: 'EditarBusModal' }).props('modelValue')).toBe(false)
  })

  it('debe abrir el reporte con el formulario del composable y los reemplazos disponibles', async () => {
    const bus = crearBus('25', 'PBA-1234', 5)
    const reemplazo = crearBus('30', 'PBB-5678', 6)

    estado.buses.value = [bus]
    estado.busesDisponibles.value = [bus, reemplazo]

    const wrapper = montarVista()
    await buscarBoton(wrapper, 'Incidente')?.trigger('click')

    const modal = wrapper.findComponent({ name: 'ReportarIncidenteModal' })
    expect(estado.reiniciarReporte).toHaveBeenCalledTimes(1)
    expect(modal.props('modelValue')).toBe(true)
    expect(modal.props('bus')).toMatchObject({ numero: '25' })
    expect(modal.props('form')).toMatchObject({
      busNumero: '25',
      reportadoPor: 'admin@cooperativa.ec',
    })
    expect(modal.props('motivos')).toHaveLength(4)
    expect(modal.props('busesReemplazo')).toEqual([
      expect.objectContaining({ numero: '30', placa: 'PBB-5678' }),
    ])
  })

  it('debe reenviar el formulario del modal de reporte al composable', async () => {
    estado.buses.value = [crearBus('25', 'PBA-1234', 5)]
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Incidente')?.trigger('click')
    await wrapper.find('[data-test="reporte-select-motivo"]').trigger('click')
    await wrapper.find('[data-test="reporte-submit"]').trigger('click')
    await flushPromises()

    expect(estado.formIncidente.motivo).toBe('Accidente')
    expect(estado.seleccionarMotivo).toHaveBeenCalledWith('Accidente')
    expect(estado.reportarIncidente).toHaveBeenCalledTimes(1)
  })

  it('debe reaccionar al éxito de useReportarIncidente, recargar y notificar', async () => {
    estado.buses.value = [crearBus('25', 'PBA-1234', 5)]
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Incidente')?.trigger('click')

    estado.responseData.value = {
      acciones: { mensaje: 'Bus 25 marcado como En mantenimiento.' },
    }
    estado.reporteSuccess.value = true
    await nextTick()
    await flushPromises()

    expect(estado.cargarBuses).toHaveBeenCalled()
    expect(estado.cargarBusesActivos).toHaveBeenCalled()
    expect(uiMocks.showAlert).toHaveBeenCalledWith({
      type: 'success',
      title: 'Incidente registrado',
      message: 'Bus 25 marcado como En mantenimiento.',
    })
    expect(wrapper.findComponent({ name: 'ReportarIncidenteModal' }).props('modelValue')).toBe(
      false,
    )
  })

  it('debe confirmar y desactivar un bus activo, luego recargar el catálogo', async () => {
    const bus = crearBus('25', 'PBA-1234', 5, EstadoBus.ACTIVO)
    estado.buses.value = [bus]
    estado.desactivarBus.mockResolvedValue(bus)
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Desactivar')?.trigger('click')
    await flushPromises()

    expect(uiMocks.showConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Desactivar bus' }),
    )
    expect(estado.desactivarBus).toHaveBeenCalledWith(5)
    expect(estado.cargarBuses).toHaveBeenCalledTimes(1)
  })

  it('no debe cambiar el estado si el usuario cancela la confirmación', async () => {
    uiMocks.showConfirm.mockResolvedValueOnce(false)
    estado.buses.value = [crearBus('25', 'PBA-1234', 5, EstadoBus.ACTIVO)]
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Desactivar')?.trigger('click')
    await flushPromises()

    expect(estado.desactivarBus).not.toHaveBeenCalled()
    expect(estado.cargarBuses).not.toHaveBeenCalled()
  })

  it('debe reactivar un bus en mantenimiento usando la sesión activa', async () => {
    const bus = crearBus('25', 'PBA-1234', 5, EstadoBus.MANTENIMIENTO)
    estado.buses.value = [bus]
    estado.reactivarBus.mockResolvedValue({
      success: true,
      busReactivado: { id: 5, numero: '25', estado: EstadoBus.ACTIVO },
      reactivadoPor: 'admin-1',
      mensaje: 'Bus 25 reactivado.',
    })
    const wrapper = montarVista()

    await buscarBoton(wrapper, 'Reactivar')?.trigger('click')
    await flushPromises()

    expect(estado.reactivarBus).toHaveBeenCalledWith(
      5,
      'admin-1',
      'Reactivación manual desde el panel de flota',
    )
    expect(estado.cargarBuses).toHaveBeenCalledTimes(1)
  })

  it('debe registrar un bus desde el formulario y notificar el éxito', async () => {
    const wrapper = montarVista()

    await buscarBoton(wrapper, '+ Registrar bus')?.trigger('click')

    await wrapper.find('#nuevo-bus-numero').setValue('40')
    await wrapper.find('#nuevo-bus-placa').setValue('PBD-3456')
    await wrapper.find('#nuevo-bus-asientos').setValue('48')
    await wrapper.find('#nuevo-bus-estructura').setValue('DosPisos')
    await wrapper.find('#panel-registrar-bus form').trigger('submit')
    await flushPromises()

    expect(estado.registrarBus).toHaveBeenCalledTimes(1)
    expect(estado.nuevoBus.value).toMatchObject({
      numero: '40',
      placa: 'PBD-3456',
      totalAsientos: 48,
      estructura: 'DosPisos',
    })
    expect(uiMocks.showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Bus registrado' }),
    )
  })
})
