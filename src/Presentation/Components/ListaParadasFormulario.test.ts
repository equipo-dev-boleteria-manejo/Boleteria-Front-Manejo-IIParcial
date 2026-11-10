// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ListaParadasIntermedias from './ListaParadasIntermedias.vue'
import type { FilaParada } from '../Composables/presentacionFrecuencias'

const parada = (extras: Partial<FilaParada> = {}): FilaParada => ({
  id: 1,
  orden: 1,
  ciudad: 'Latacunga',
  tiempo: '2 h',
  minutosDesdeOrigen: 120,
  permiteVenta: true,
  costo: '$2.00',
  costoProporcional: 2,
  ...extras,
})

function montar(props: Record<string, unknown> = {}) {
  return mount(ListaParadasIntermedias, {
    props: { paradas: [parada()], extremos: ['Quito', 'Cuenca'], ordenSugerido: 2, ...props },
  })
}

const formulario = (wrapper: ReturnType<typeof montar>) => wrapper.find('form[aria-label="Agregar parada intermedia"]')

describe('ListaParadasIntermedias - agregar parada con validación', () => {
  it('arranca sin errores y con el orden sugerido', () => {
    const wrapper = montar()

    expect((wrapper.find('#parada-orden').element as HTMLInputElement).value).toBe('2')
    expect(wrapper.text()).not.toContain('es obligatoria')
  })

  it('formulario vacío: al agregar muestra los obligatorios y no emite', async () => {
    const wrapper = montar()

    await formulario(wrapper).trigger('submit')

    expect(wrapper.emitted('agregar')).toBeUndefined()
    expect(wrapper.text()).toContain('La ciudad de la parada es obligatoria')
    expect(wrapper.text()).toContain('Los minutos desde el origen son obligatorios')
  })

  it('rechaza como parada el origen o el destino de la frecuencia', async () => {
    const wrapper = montar()

    await wrapper.find('#parada-ciudad').setValue('Cuenca')

    expect(wrapper.text()).toContain('La parada no puede ser el origen ni el destino')
  })

  it('rechaza un orden ya usado y bloquea el botón', async () => {
    const wrapper = montar()

    await wrapper.find('#parada-orden').setValue('1')

    expect(wrapper.text()).toContain('Ya existe una parada con el orden 1')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('valida minutos y costo en tiempo real', async () => {
    const wrapper = montar()

    await wrapper.find('#parada-minutos').setValue('-3')
    await wrapper.find('#parada-costo').setValue('1.999')

    expect(wrapper.text()).toContain('Debe ser un número entero de 0 o más')
    expect(wrapper.text()).toContain('Máximo 2 decimales')
  })

  it('con datos válidos emite agregar con valores numéricos', async () => {
    const wrapper = montar()

    await wrapper.find('#parada-ciudad').setValue('Riobamba')
    await wrapper.find('#parada-minutos').setValue('240')
    await wrapper.find('#parada-costo').setValue('3.5')
    await formulario(wrapper).trigger('submit')

    expect(wrapper.emitted('agregar')).toHaveLength(1)
    expect(wrapper.emitted('agregar')?.[0][0]).toEqual({
      ciudad: 'Riobamba',
      orden: 2,
      minutosDesdeOrigen: 240,
      permiteVenta: true,
      costoProporcional: 3.5,
    })
  })

  it('al terminar de guardar sin error limpia el formulario y sugiere el siguiente orden', async () => {
    const wrapper = montar()
    await wrapper.find('#parada-ciudad').setValue('Riobamba')
    await wrapper.find('#parada-minutos').setValue('240')
    await formulario(wrapper).trigger('submit')

    await wrapper.setProps({ loading: true })
    await wrapper.setProps({
      loading: false,
      paradas: [parada(), parada({ id: 2, orden: 2, ciudad: 'Riobamba' })],
      ordenSugerido: 3,
    })

    expect((wrapper.find('#parada-ciudad').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#parada-orden').element as HTMLInputElement).value).toBe('3')
    expect(wrapper.text()).not.toContain('es obligatoria')
  })

  it('si el guardado falla conserva lo escrito', async () => {
    const wrapper = montar()
    await wrapper.find('#parada-ciudad').setValue('Riobamba')
    await wrapper.find('#parada-minutos').setValue('240')
    await formulario(wrapper).trigger('submit')

    await wrapper.setProps({ loading: true })
    await wrapper.setProps({ loading: false, error: 'No se pudo agregar' })

    expect((wrapper.find('#parada-ciudad').element as HTMLInputElement).value).toBe('Riobamba')
  })

  it('"Eliminar" emite el id de la parada', async () => {
    const wrapper = montar()

    await wrapper.find('[aria-label="Eliminar la parada Latacunga"]').trigger('click')

    expect(wrapper.emitted('eliminar')?.[0]).toEqual([1])
  })

  it('"Editar" precarga la parada en el formulario y cambia el título y los botones', async () => {
    const wrapper = montar()

    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')

    expect(wrapper.text()).toContain('Editar parada')
    expect((wrapper.find('#parada-ciudad').element as HTMLInputElement).value).toBe('Latacunga')
    expect((wrapper.find('#parada-orden').element as HTMLInputElement).value).toBe('1')
    expect((wrapper.find('#parada-minutos').element as HTMLInputElement).value).toBe('120')
    expect((wrapper.find('#parada-costo').element as HTMLInputElement).value).toBe('2')
    expect(wrapper.text()).toContain('Guardar cambios')
    expect(wrapper.text()).toContain('Cancelar edición')
  })

  it('al guardar la edición emite actualizar con el id y los datos, no agregar', async () => {
    const wrapper = montar()
    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')

    await wrapper.find('#parada-minutos').setValue('150')
    await formulario(wrapper).trigger('submit')

    expect(wrapper.emitted('agregar')).toBeUndefined()
    expect(wrapper.emitted('actualizar')).toHaveLength(1)
    expect(wrapper.emitted('actualizar')?.[0][0]).toEqual({
      id: 1,
      cambios: { ciudad: 'Latacunga', orden: 1, minutosDesdeOrigen: 150, permiteVenta: true, costoProporcional: 2 },
    })
  })

  it('"Cancelar edición" vuelve al formulario de agregar con el orden sugerido', async () => {
    const wrapper = montar()
    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')

    const cancelar = wrapper.findAll('button').find((boton) => boton.text() === 'Cancelar edición')
    await cancelar?.trigger('click')

    expect(wrapper.text()).not.toContain('Cancelar edición')
    expect((wrapper.find('#parada-ciudad').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#parada-orden').element as HTMLInputElement).value).toBe('2')
  })

  it('si la parada editada desaparece de la lista, cancela la edición', async () => {
    const wrapper = montar()
    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')

    await wrapper.setProps({ paradas: [] })

    expect(wrapper.text()).not.toContain('Cancelar edición')
  })

  it('tras guardar la edición sin error vuelve al formulario de agregar', async () => {
    const wrapper = montar()
    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')
    await formulario(wrapper).trigger('submit')

    await wrapper.setProps({ loading: true })
    await wrapper.setProps({ loading: false })

    expect(wrapper.text()).not.toContain('Cancelar edición')
    expect((wrapper.find('#parada-ciudad').element as HTMLInputElement).value).toBe('')
  })

  it('al guardar la edición sin cambiar nada emite sinCambios, no actualiza y sale de la edición', async () => {
    const wrapper = montar()
    await wrapper.find('[aria-label="Editar la parada Latacunga"]').trigger('click')

    await formulario(wrapper).trigger('submit')

    expect(wrapper.emitted('actualizar')).toBeUndefined()
    expect(wrapper.emitted('sinCambios')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Cancelar edición')
  })
})
