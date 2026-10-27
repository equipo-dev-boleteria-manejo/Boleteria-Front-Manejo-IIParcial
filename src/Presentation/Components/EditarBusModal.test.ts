// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EditarBusModal from './EditarBusModal.vue'

const busBase = {
  id: 5,
  numero: '25',
  placa: 'PBA-1234',
  totalAsientos: 40,
  estructura: 'UnPiso' as const,
  estado: 'Activo',
}

function montarModal(props: Record<string, unknown> = {}) {
  return mount(EditarBusModal, {
    props: {
      modelValue: true,
      bus: busBase,
      loading: false,
      error: '',
      ...props,
    },
    global: {
      stubs: { teleport: true },
    },
  })
}

describe('EditarBusModal', () => {
  it('debe cargar en el formulario los datos del bus recibido por props', () => {
    const wrapper = montarModal()

    expect(wrapper.text()).toContain('Editar bus N.º 25')
    expect((wrapper.find('#editar-bus-numero').element as HTMLInputElement).value).toBe('25')
    expect((wrapper.find('#editar-bus-placa').element as HTMLInputElement).value).toBe(
      'PBA-1234',
    )
    expect((wrapper.find('#editar-bus-asientos').element as HTMLInputElement).value).toBe('40')
    expect((wrapper.find('#editar-bus-estructura').element as HTMLSelectElement).value).toBe(
      'UnPiso',
    )
  })

  it('debe emitir save con los datos editados y la estructura seleccionada', async () => {
    const wrapper = montarModal()

    await wrapper.find('#editar-bus-numero').setValue('30')
    await wrapper.find('#editar-bus-placa').setValue('PBB-5678')
    await wrapper.find('#editar-bus-asientos').setValue('45')
    await wrapper.find('#editar-bus-estructura').setValue('DosPisos')
    await wrapper.find('#form-editar-bus').trigger('submit')

    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('save')?.[0][0]).toEqual({
      id: 5,
      numero: '30',
      placa: 'PBB-5678',
      totalAsientos: 45,
      estructura: 'DosPisos',
    })
  })

  it('debe mostrar el error recibido y no emitir save mientras carga', async () => {
    const wrapper = montarModal({ loading: true, error: 'La placa ya está registrada.' })

    expect(wrapper.text()).toContain('La placa ya está registrada.')
    expect(wrapper.find('#editar-bus-numero').attributes('disabled')).toBeDefined()

    const submit = wrapper.find('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.find('#form-editar-bus').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('debe emitir update:modelValue y close al cancelar', async () => {
    const wrapper = montarModal()
    const cancelar = wrapper.findAll('button').find((boton) => boton.text() === 'Cancelar')

    expect(cancelar).toBeDefined()
    await cancelar?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('debe reiniciar el borrador al reabrir el modal con otro bus', async () => {
    const wrapper = montarModal()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({
      modelValue: true,
      bus: { ...busBase, id: 6, numero: '30', placa: 'PBB-5678', totalAsientos: 52 },
    })

    expect((wrapper.find('#editar-bus-numero').element as HTMLInputElement).value).toBe('30')
    expect((wrapper.find('#editar-bus-placa').element as HTMLInputElement).value).toBe(
      'PBB-5678',
    )
    expect((wrapper.find('#editar-bus-asientos').element as HTMLInputElement).value).toBe('52')
  })
})
