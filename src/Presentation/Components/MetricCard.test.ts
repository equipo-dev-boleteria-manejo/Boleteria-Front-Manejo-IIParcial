// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricCard from './MetricCard.vue'

describe('MetricCard', () => {
  it('debe renderizar título, valor, descripción e ícono por defecto', () => {
    const wrapper = mount(MetricCard, {
      props: {
        title: 'Total Eventos',
        value: 5,
        description: 'Trazabilidad general del sistema',
        icon: '📋',
      },
    })

    expect(wrapper.text()).toContain('Total Eventos')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('Trazabilidad general del sistema')
    expect(wrapper.text()).toContain('📋')
  })

  it('debe aplicar estilos según la variante especificada', () => {
    const wrapperSuccess = mount(MetricCard, {
      props: {
        title: 'Operaciones Exitosas',
        value: 10,
        variant: 'success',
      },
    })
    expect(wrapperSuccess.classes()).toContain('border-emerald-200')

    const wrapperDanger = mount(MetricCard, {
      props: {
        title: 'Alertas y Fallos',
        value: 0,
        variant: 'danger',
      },
    })
    expect(wrapperDanger.classes()).toContain('border-rose-200')
  })

  it('debe mostrar el estado de carga con animación pulse', () => {
    const wrapper = mount(MetricCard, {
      props: {
        title: 'Cargando',
        value: 100,
        loading: true,
      },
    })

    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('100')
  })
})
