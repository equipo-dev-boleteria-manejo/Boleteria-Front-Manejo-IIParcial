// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchInput from './SearchInput.vue'

describe('SearchInput', () => {
  it('debe renderizar el placeholder y valor inicial', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: 'Bus 25',
        placeholder: 'Buscar por disco o placa...',
      },
    })

    const input = wrapper.find('input')
    expect(input.element.value).toBe('Bus 25')
    expect(input.attributes('placeholder')).toBe('Buscar por disco o placa...')
  })

  it('debe emitir update:modelValue al tipear', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
    })

    const input = wrapper.find('input')
    await input.setValue('Quito')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Quito'])
  })

  it('debe mostrar el botón de limpiar cuando hay texto y emitir clear al presionarlo', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: 'Texto para borrar',
      },
    })

    const clearBtn = wrapper.find('button[title="Limpiar búsqueda"]')
    expect(clearBtn.exists()).toBe(true)

    await clearBtn.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    expect(wrapper.emitted('clear')).toBeDefined()
  })
})
