// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import FrecuenciasAdmin from './FrecuenciasAdmin.vue'
import type { DatosEdicionFrecuencia, FilaFrecuencia } from '../../Composables/presentacionFrecuencias'

const mocks = vi.hoisted(() => ({
  estado: {} as Record<string, unknown>,
  feedback: {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../Composables/useFrecuencias', () => ({ useFrecuencias: () => mocks.estado }))
vi.mock('../../Composables/useFeedback', () => ({ useFeedback: () => mocks.feedback }))

const fila: FilaFrecuencia = {
  id: 7,
  identificador: 'FR-001',
  origen: 'Quito',
  destino: 'Cuenca',
  ruta: 'Quito → Cuenca',
  horaSalida: '08:30',
  tipo: 'Con paradas',
  dias: 'Lun, Vie',
  totalParadas: 0,
  tiempoUltimaParada: 'Sin estimar',
  codigoAnt: 'ANT-0145',
  activa: true,
  faltanParadas: false,
}

const datos: DatosEdicionFrecuencia = {
  cooperativaId: 1,
  identificadorFrecuencia: 'FR-001',
  ciudadOrigen: 'Quito',
  ciudadDestino: 'Cuenca',
  horaSalida: '08:30',
  esDirecto: false,
  diasOperacion: ['Lunes', 'Viernes'],
  codigoAnt: 'ANT-0145',
  resolucionAnt: '',
  totalParadas: 0,
}

function configurar(overrides: Record<string, unknown> = {}) {
  mocks.estado = {
    loading: ref(false),
    error: ref(null),
    filaSeleccionada: ref(null),
    paradasSeleccionadas: ref([]),
    ordenSugeridoParada: ref(1),
    resumen: ref({ total: 1, activas: 1, inactivas: 0, conParadas: 0 }),
    busqueda: ref(''),
    filtroEstado: ref('Todas'),
    filasFiltradas: ref([fila]),
    reiniciarFiltros: vi.fn(),
    cargarFrecuencias: vi.fn().mockResolvedValue(undefined),
    seleccionarFrecuencia: vi.fn().mockResolvedValue(undefined),
    limpiarSeleccion: vi.fn(),
    registrarFrecuencia: vi.fn().mockResolvedValue(undefined),
    guardarFrecuencia: vi.fn().mockResolvedValue(undefined),
    obtenerDatosEdicion: vi.fn().mockReturnValue(datos),
    activarFrecuencia: vi.fn().mockResolvedValue(undefined),
    desactivarFrecuencia: vi.fn().mockResolvedValue(undefined),
    agregarParadaAFrecuencia: vi.fn().mockResolvedValue(undefined),
    actualizarParada: vi.fn().mockResolvedValue(undefined),
    eliminarParada: vi.fn().mockResolvedValue(undefined),
    limpiarError: vi.fn(),
    ...overrides,
  }
}

async function montar() {
  const wrapper = mount(FrecuenciasAdmin, {
    global: { plugins: [createPinia()], stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

const campo = (wrapper: Awaited<ReturnType<typeof montar>>, selector: string) =>
  wrapper.find(selector).element as HTMLInputElement

describe('FrecuenciasAdmin - editar frecuencia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configurar()
  })

  it('"Editar" abre el modal con los datos de la frecuencia precargados', async () => {
    const wrapper = await montar()

    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    expect(wrapper.text()).toContain('Editar frecuencia')
    expect(campo(wrapper, '#frecuencia-origen').value).toBe('Quito')
    expect(campo(wrapper, '#frecuencia-destino').value).toBe('Cuenca')
    expect(campo(wrapper, '#frecuencia-hora').value).toBe('08:30')
    expect(campo(wrapper, '#frecuencia-identificador').value).toBe('FR-001')
    expect(campo(wrapper, '#frecuencia-identificador').disabled).toBe(true)
    expect((mocks.estado.obtenerDatosEdicion as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(7)
  })

  it('al guardar actualiza la frecuencia, cierra el modal y muestra el toast de éxito', async () => {
    const wrapper = await montar()
    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    await wrapper.find('#frecuencia-destino').setValue('Loja')
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.estado.guardarFrecuencia).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ ciudadOrigen: 'Quito', ciudadDestino: 'Loja', horaSalida: '08:30' }),
    )
    expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Frecuencia FR-001 actualizada correctamente.')
    expect(wrapper.find('#form-frecuencia').exists()).toBe(false)
  })

  it('al guardar la frecuencia sin modificar nada cierra el modal con un aviso y no llama al servidor', async () => {
    const wrapper = await montar()
    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.estado.guardarFrecuencia).not.toHaveBeenCalled()
    expect(mocks.feedback.showSuccess).not.toHaveBeenCalled()
    expect(mocks.feedback.showInfo).toHaveBeenCalledWith('No se realizaron cambios en la frecuencia FR-001.')
    expect(wrapper.find('#form-frecuencia').exists()).toBe(false)
  })

  it('si el guardado falla deja el modal abierto y no muestra el toast de éxito', async () => {
    configurar({
      guardarFrecuencia: vi.fn().mockRejectedValue(new Error('boom')),
      error: ref('No se pudo actualizar'),
    })
    const wrapper = await montar()
    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    await wrapper.find('#frecuencia-destino').setValue('Loja')
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.feedback.showSuccess).not.toHaveBeenCalled()
    expect(mocks.feedback.showError).toHaveBeenCalledWith('No se pudo actualizar')
    expect(wrapper.find('#form-frecuencia').exists()).toBe(true)
    expect(wrapper.text()).toContain('No se pudo actualizar')
  })

  it('avisa con un toast de error si la frecuencia ya no está en la lista', async () => {
    configurar({ obtenerDatosEdicion: vi.fn().mockReturnValue(null) })
    const wrapper = await montar()

    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    expect(mocks.feedback.showError).toHaveBeenCalled()
    expect(wrapper.find('#form-frecuencia').exists()).toBe(false)
  })

  it('"Registrar frecuencia" abre el modal vacío, en modo registro', async () => {
    const wrapper = await montar()
    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')
    const cancelar = wrapper.findAll('button').find((boton) => boton.text() === 'Cancelar')
    await cancelar?.trigger('click')
    expect(wrapper.find('#form-frecuencia').exists()).toBe(false)

    const crear = wrapper.findAll('button').find((boton) => boton.text().includes('Registrar frecuencia'))
    await crear?.trigger('click')

    expect(wrapper.text()).toContain('Registrar nueva frecuencia')
    expect(campo(wrapper, '#frecuencia-origen').value).toBe('')
    expect(campo(wrapper, '#frecuencia-identificador').disabled).toBe(false)
  })
})

describe('FrecuenciasAdmin - registrar con cooperativa por defecto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configurar()
  })

  it('sin cooperativa en la sesión usa la cooperativa 1 y registra con ella', async () => {
    const wrapper = await montar()
    const crear = wrapper.findAll('button').find((boton) => boton.text().includes('Registrar frecuencia'))
    await crear?.trigger('click')

    expect(wrapper.text()).toContain('Cooperativa N.º 1')

    await wrapper.find('#frecuencia-origen').setValue('Quito')
    await wrapper.find('#frecuencia-destino').setValue('Ambato')
    await wrapper.find('#frecuencia-hora').setValue('07:00')
    await wrapper.find('#frecuencia-identificador').setValue('FR-004')
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.estado.registrarFrecuencia).toHaveBeenCalledWith(
      expect.objectContaining({ cooperativaId: 1, identificadorFrecuencia: 'FR-004' }),
    )
    expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Frecuencia FR-004 registrada correctamente.')
  })
})

describe('FrecuenciasAdmin - editar una parada', () => {
  const parada = {
    id: 11,
    orden: 1,
    ciudad: 'Latacunga',
    tiempo: '2 h',
    minutosDesdeOrigen: 120,
    permiteVenta: true,
    costo: '$2.00',
    costoProporcional: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    configurar({ filaSeleccionada: ref(fila), paradasSeleccionadas: ref([parada]) })
  })

  async function abrirParadas() {
    const wrapper = await montar()
    await wrapper.find('[aria-label="Gestionar las paradas de la frecuencia FR-001"]').trigger('click')
    await flushPromises()
    return wrapper
  }

  it('guarda los cambios de una parada y muestra el toast de éxito', async () => {
    const wrapper = await abrirParadas()

    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')
    await wrapper.find('#parada-minutos').setValue('150')
    await wrapper.find('form[aria-label="Agregar parada intermedia"]').trigger('submit')
    await flushPromises()

    expect(mocks.estado.actualizarParada).toHaveBeenCalledWith(11, {
      ciudad: 'Latacunga',
      orden: 1,
      minutosDesdeOrigen: 150,
      permiteVenta: true,
      costoProporcional: 2,
    })
    expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Parada actualizada correctamente.')
  })

  it('si falla muestra el error dentro del modal y no el toast de éxito', async () => {
    configurar({
      filaSeleccionada: ref(fila),
      paradasSeleccionadas: ref([parada]),
      actualizarParada: vi.fn().mockRejectedValue(new Error('boom')),
      error: ref('Orden inconsistente con las demás paradas'),
    })
    const wrapper = await abrirParadas()

    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')
    await wrapper.find('#parada-minutos').setValue('150')
    await wrapper.find('form[aria-label="Agregar parada intermedia"]').trigger('submit')
    await flushPromises()

    expect(mocks.feedback.showSuccess).not.toHaveBeenCalled()
    expect(mocks.feedback.showError).toHaveBeenCalledWith('Orden inconsistente con las demás paradas')
    expect(wrapper.text()).toContain('Orden inconsistente con las demás paradas')
  })

  it('al guardar sin modificar nada avisa con un toast informativo y no llama al servidor', async () => {
    const wrapper = await abrirParadas()

    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')
    await wrapper.find('form[aria-label="Agregar parada intermedia"]').trigger('submit')
    await flushPromises()

    expect(mocks.estado.actualizarParada).not.toHaveBeenCalled()
    expect(mocks.feedback.showSuccess).not.toHaveBeenCalled()
    expect(mocks.feedback.showInfo).toHaveBeenCalledWith('No se realizaron cambios en la parada.')
  })

  it('si el registro falla (por ejemplo, identificador repetido) muestra el toast de error y deja el modal abierto', async () => {
    configurar({
      registrarFrecuencia: vi.fn().mockRejectedValue(new Error('duplicado')),
      error: ref('El identificador FR-001 ya existe para la cooperativa 1'),
    })
    const wrapper = await montar()
    const crear = wrapper.findAll('button').find((boton) => boton.text().includes('Registrar frecuencia'))
    await crear?.trigger('click')

    await wrapper.find('#frecuencia-origen').setValue('Quito')
    await wrapper.find('#frecuencia-destino').setValue('Ambato')
    await wrapper.find('#frecuencia-hora').setValue('07:00')
    await wrapper.find('#frecuencia-identificador').setValue('FR-001')
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.feedback.showError).toHaveBeenCalledWith('El identificador FR-001 ya existe para la cooperativa 1')
    expect(mocks.feedback.showSuccess).not.toHaveBeenCalled()
    expect(wrapper.find('#form-frecuencia').exists()).toBe(true)
  })
})

describe('FrecuenciasAdmin - frecuencias con paradas incompletas y conversión a directa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configurar()
  })

  it('no permite activar una frecuencia incompleta: avisa con un toast y no pide confirmación', async () => {
    const incompleta = { ...fila, activa: false, totalParadas: 0, faltanParadas: true }
    configurar({ filasFiltradas: ref([incompleta]) })
    const wrapper = await montar()

    await wrapper.find('[aria-label="Activar la frecuencia FR-001"]').trigger('click')
    await flushPromises()

    expect(mocks.feedback.showError).toHaveBeenCalledWith(
      'Agrega al menos una parada a la frecuencia FR-001 antes de activarla.',
    )
    expect(mocks.feedback.confirm).not.toHaveBeenCalled()
    expect(mocks.estado.activarFrecuencia).not.toHaveBeenCalled()
  })

  it('convertir en directa una frecuencia con paradas pide confirmación y, si se acepta, guarda', async () => {
    configurar({
      obtenerDatosEdicion: vi.fn().mockReturnValue({ ...datos, esDirecto: false, totalParadas: 3 }),
    })
    mocks.feedback.confirm.mockResolvedValue(true)
    const wrapper = await montar()
    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    const directo = wrapper.findAll('input[type="checkbox"]').find((casilla) => !casilla.element.closest('fieldset'))
    await directo?.setValue(true)
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.feedback.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Convertir en frecuencia directa',
        message: expect.stringContaining('las 3 paradas intermedias'),
      }),
    )
    expect(mocks.estado.guardarFrecuencia).toHaveBeenCalledWith(7, expect.objectContaining({ esDirecto: true }))
    expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Frecuencia FR-001 actualizada correctamente.')
  })

  it('si se cancela la confirmación no elimina ni guarda nada y el modal sigue abierto', async () => {
    configurar({
      obtenerDatosEdicion: vi.fn().mockReturnValue({ ...datos, esDirecto: false, totalParadas: 3 }),
    })
    mocks.feedback.confirm.mockResolvedValue(false)
    const wrapper = await montar()
    await wrapper.find('[aria-label="Editar la frecuencia FR-001"]').trigger('click')

    const directo = wrapper.findAll('input[type="checkbox"]').find((casilla) => !casilla.element.closest('fieldset'))
    await directo?.setValue(true)
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.estado.guardarFrecuencia).not.toHaveBeenCalled()
    expect(wrapper.find('#form-frecuencia').exists()).toBe(true)
  })

  it('eliminar la única parada de una frecuencia activa avisa en la confirmación y con un toast ámbar', async () => {
    const parada = {
      id: 11, orden: 1, ciudad: 'Latacunga', tiempo: '2 h', minutosDesdeOrigen: 120,
      permiteVenta: true, costo: '$2.00', costoProporcional: 2,
    }
    configurar({ filaSeleccionada: ref(fila), paradasSeleccionadas: ref([parada]) })
    mocks.feedback.confirm.mockResolvedValue(true)
    const wrapper = await montar()
    await wrapper.find('[aria-label="Gestionar las paradas de la frecuencia FR-001"]').trigger('click')
    await flushPromises()

    await wrapper.find('[aria-label="Eliminar la parada Latacunga"]').trigger('click')
    await flushPromises()

    expect(mocks.feedback.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('única parada') }),
    )
    expect(mocks.estado.eliminarParada).toHaveBeenCalledWith(11)
    expect(mocks.feedback.showWarning).toHaveBeenCalledWith(
      'La frecuencia quedó sin paradas y se desactivó hasta que agregues al menos una.',
    )
  })

  it('registrar una frecuencia con paradas sin ninguna avisa que quedó inactiva', async () => {
    configurar({
      registrarFrecuencia: vi.fn().mockResolvedValue({ estaIncompleta: () => true }),
    })
    const wrapper = await montar()
    const crear = wrapper.findAll('button').find((boton) => boton.text().includes('Registrar frecuencia'))
    await crear?.trigger('click')

    await wrapper.find('#frecuencia-origen').setValue('Quito')
    await wrapper.find('#frecuencia-destino').setValue('Ambato')
    await wrapper.find('#frecuencia-hora').setValue('07:00')
    await wrapper.find('#frecuencia-identificador').setValue('FR-009')
    const directo = wrapper.findAll('input[type="checkbox"]').find((casilla) => !casilla.element.closest('fieldset'))
    await directo?.setValue(false)
    await wrapper.find('#form-frecuencia').trigger('submit')
    await flushPromises()

    expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Frecuencia FR-009 registrada correctamente.')
    expect(mocks.feedback.showWarning).toHaveBeenCalledWith(
      'La frecuencia FR-009 quedó inactiva: agrégale al menos una parada para activarla.',
    )
  })
})
