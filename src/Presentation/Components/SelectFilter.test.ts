// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectFilter from './SelectFilter.vue'

describe('SelectFilter', () => {
  it('debe renderizar la etiqueta y las opciones normalizadas', () => {
    const wrapper = mount(SelectFilter, {
      props: {
        label: 'Estado:',
        modelValue: 'Activo',
        options: [
          { value: 'Todos', label: 'Todos los estados' },
          { value: 'Activo', label: 'Activo' },
          { value: 'Inactivo', label: 'Inactivo' },
        ],
      },
    })

    expect(wrapper.text()).toContain('Estado:')
    const options = wrapper.findAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].text()).toBe('Todos los estados')
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('Activo')
  })

  it('debe emitir update:modelValue y change al seleccionar una opción', async () => {
    const wrapper = mount(SelectFilter, {
      props: {
        modelValue: 'Todos',
        options: ['Todos', 'UnPiso', 'DosPisos'],
      },
    })

    await wrapper.find('select').setValue('DosPisos')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['DosPisos'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['DosPisos'])
  })
})
