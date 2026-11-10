// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateButton from './CreateButton.vue'

describe('CreateButton', () => {
  it('debe renderizar el texto del botón y el ícono plus', () => {
    const wrapper = mount(CreateButton, {
      props: {
        label: 'Registrar bus',
      },
    })

    expect(wrapper.text()).toContain('Registrar bus')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('debe mostrar el spinner cuando loading es true y estar deshabilitado', () => {
    const wrapper = mount(CreateButton, {
      props: {
        label: 'Guardar',
        loading: true,
      },
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('debe emitir el evento click al interactuar', async () => {
    const wrapper = mount(CreateButton, {
      props: {
        label: 'Nuevo Usuario',
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
