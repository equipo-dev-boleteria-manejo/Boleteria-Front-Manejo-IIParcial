import { describe, expect, it } from 'vitest'
import PageSizeFilter from './PageSizeFilter.vue'
import { renderizar } from '../testing/renderizarSsr'

describe('PageSizeFilter Component', () => {
  it('renderiza con opciones por defecto (5, 10, 20, 50)', async () => {
    const { html } = await renderizar(PageSizeFilter, {
      modelValue: 10,
    })

    expect(html).toContain('Mostrar:')
    expect(html).toContain('5 filas')
    expect(html).toContain('10 filas')
    expect(html).toContain('20 filas')
    expect(html).toContain('50 filas')
  })

  it('permite personalizar etiqueta y opciones numéricas', async () => {
    const { html } = await renderizar(PageSizeFilter, {
      label: 'Filas:',
      options: [10, 25, 100],
      modelValue: 25,
    })

    expect(html).toContain('Filas:')
    expect(html).toContain('10 filas')
    expect(html).toContain('25 filas')
    expect(html).toContain('100 filas')
    expect(html).not.toContain('50 filas')
  })
})
