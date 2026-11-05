import { describe, expect, it } from 'vitest';
import RutasAdmin from './RutasAdmin.vue';
import { renderizar } from '../../testing/renderizarSsr';

describe('RutasAdmin View', () => {
  it('renderiza el encabezado y métricas de estados con Pinia', async () => {
    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('Programación de Rutas Diarias');
    expect(html).toContain('Control operativo de viajes');
    expect(html).toContain('Programar Ruta');
    expect(html).toContain('Todas las Rutas');
    expect(html).toContain('Programadas');
    expect(html).toContain('En Curso');
    expect(html).toContain('Finalizadas');
  });

  it('renderiza la barra de búsqueda y filtro de fecha', async () => {
    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('id="filtro-texto"');
    expect(html).toContain('id="filtro-fecha"');
    expect(html).toContain('Buscar por origen, destino o bus...');
  });

  it('muestra estado vacío o tabla según los datos iniciales', async () => {
    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    // En SSR sin mock activo de DB, se visualiza el contenedor limpio de listado o el estado vacío
    expect(html).toMatch(/No se encontraron rutas|Listado de Rutas Programadas/);
  });
});

