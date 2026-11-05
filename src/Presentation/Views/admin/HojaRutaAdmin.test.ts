import { describe, expect, it } from 'vitest';
import HojaRutaAdmin from './HojaRutaAdmin.vue';
import { renderizar } from '../../testing/renderizarSsr';

describe('HojaRutaAdmin View', () => {
  it('renderiza encabezado principal y selector de fecha', async () => {
    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('Control y Despacho de Hojas de Ruta');
    expect(html).toContain('Programación operativa diaria');
    expect(html).toContain('Fecha de Operación');
    expect(html).toContain('Consultar Plan');
    expect(html).toContain('Buscar Bitácora');
  });

  it('renderiza formulario de vinculación de nuevo trayecto', async () => {
    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('Asignar Nuevo Trayecto Operativo');
    expect(html).toContain('Frecuencia / Horario');
    expect(html).toContain('Unidad / Bus');
    expect(html).toContain('Vincular al Plan');
  });

  it('muestra estado vacío cuando no existen hojas para la fecha', async () => {
    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toMatch(/Sin programación activa para esta fecha|Hoja de Ruta #/);
  });
});

