// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TableBase from './TableBase.vue'

describe('TableBase', () => {
  it('debe renderizar el título y subtítulo en la cabecera', () => {
    const wrapper = mount(TableBase, {
      props: {
        title: 'Catálogo de flota',
        subtitle: 'Unidades registradas en el sistema',
      },
    })

    expect(wrapper.text()).toContain('Catálogo de flota')
    expect(wrapper.text()).toContain('Unidades registradas en el sistema')
  })

  it('debe renderizar el esqueleto de carga cuando loading es true', () => {
    const wrapper = mount(TableBase, {
      props: {
        loading: true,
        skeletonRows: 4,
      },
    })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.findAll('.animate-pulse')).toHaveLength(4)
  })

  it('debe renderizar el estado vacío cuando empty es true', () => {
    const wrapper = mount(TableBase, {
      props: {
        empty: true,
        emptyIcon: '🚌',
        emptyTitle: 'No hay buses registrados',
        emptyDescription: 'Registra el primer bus para comenzar.',
      },
    })

    expect(wrapper.text()).toContain('🚌')
    expect(wrapper.text()).toContain('No hay buses registrados')
    expect(wrapper.text()).toContain('Registra el primer bus para comenzar.')
  })

  it('debe renderizar las columnas y las filas del cuerpo cuando hay datos', () => {
    const wrapper = mount(TableBase, {
      props: {
        columns: [
          { key: 'numero', label: 'Número' },
          { key: 'placa', label: 'Placa' },
        ],
      },
      slots: {
        default: '<tr><td>Bus 25</td><td>PBA-1234</td></tr>',
        footer: '<span>Total: 1 registro</span>',
      },
    })

    expect(wrapper.find('thead').text()).toContain('Número')
    expect(wrapper.find('thead').text()).toContain('Placa')
    expect(wrapper.find('tbody').text()).toContain('Bus 25')
    expect(wrapper.find('tbody').text()).toContain('PBA-1234')
    expect(wrapper.text()).toContain('Total: 1 registro')
  })
})
