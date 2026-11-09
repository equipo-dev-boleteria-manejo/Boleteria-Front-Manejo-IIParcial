// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RefreshButton from './RefreshButton.vue'

describe('RefreshButton', () => {
  it('debe renderizar la etiqueta Recargar y el ícono de refresco', () => {
    const wrapper = mount(RefreshButton)

    expect(wrapper.text()).toContain('Recargar')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('debe animar el ícono con animate-spin cuando loading es true', () => {
    const wrapper = mount(RefreshButton, {
      props: {
        loading: true,
      },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('debe emitir el evento click al pulsarlo', async () => {
    const wrapper = mount(RefreshButton)

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
