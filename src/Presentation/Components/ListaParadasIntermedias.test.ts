import { describe, expect, it } from 'vitest';
import ListaParadasIntermedias from './ListaParadasIntermedias.vue';
import { renderizar } from '../testing/renderizarSsr';
import type { FilaParada } from '../Composables/presentacionFrecuencias';

const parada = (extras: Partial<FilaParada> = {}): FilaParada => ({
  id: 1,
  orden: 1,
  ciudad: 'Latacunga',
  tiempo: '2 h',
  minutosDesdeOrigen: 120,
  permiteVenta: true,
  costo: '$2.50',
  ...extras,
});

describe('ListaParadasIntermedias', () => {
  it('estado vacío: muestra el mensaje y no renderiza la tabla', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, { paradas: [] });

    expect(html).toContain('Esta frecuencia no tiene paradas intermedias');
    expect(html).toContain('0 paradas');
    expect(html).not.toContain('<table');
  });

  it('estado con datos: muestra cada parada con su tiempo, venta y costo', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, {
      paradas: [parada(), parada({ id: 2, orden: 2, ciudad: 'Riobamba', tiempo: '4 h', permiteVenta: false, costo: '—' })],
    });

    expect(html).toContain('<table');
    expect(html).toContain('Latacunga');
    expect(html).toContain('Riobamba');
    expect(html).toContain('Permite venta');
    expect(html).toContain('Sin venta');
    expect(html).toContain('$2.50');
    expect(html).toContain('2 paradas');
    expect(html).not.toContain('no tiene paradas intermedias');
  });

  it('usa el singular cuando hay una sola parada', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, { paradas: [parada()] });

    expect(html).toContain('1 parada');
    expect(html).not.toContain('1 paradas');
  });

  it('estado de error: muestra el mensaje en un banner accesible', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, {
      paradas: [],
      error: 'La parada es inválida',
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('La parada es inválida');
  });

  it('estado de carga: marca la tabla como ocupada y deshabilita las acciones', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, { paradas: [parada()], loading: true });

    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Eliminar la parada Latacunga"/);
  });

  it('precarga el orden sugerido en el formulario', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, { paradas: [parada()], ordenSugerido: 3 });

    expect(html).toMatch(/<input[^>]*type="number"[^>]*value="3"/);
  });

  it('permite venta por defecto en el formulario de nueva parada', async () => {
    const { html } = await renderizar(ListaParadasIntermedias, { paradas: [] });

    expect(html).toMatch(/<input(?=[^>]*type="checkbox")(?=[^>]*\bchecked\b)[^>]*>/);
    expect(html).toContain('Agregar parada');
  });
});
