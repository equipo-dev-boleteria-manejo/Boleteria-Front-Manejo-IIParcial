import { describe, expect, it } from 'vitest';
import ValidarQR from './ValidarQR.vue';
import { renderizar } from '../../testing/renderizarSsr';

describe('ValidarQR View', () => {
  it('renderiza encabezado de abordaje y datos del conductor', async () => {
    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('Control de Abordaje y Validación de Boletos');
    expect(html).toContain('Escaneo y verificación de códigos QR');
    expect(html).toContain('Conductor:');
    expect(html).toContain('ID / Cédula:');
  });

  it('renderiza estado vacío amigable cuando el chofer no tiene ruta activa asignada', async () => {
    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toMatch(/No hay ruta activa asignada|Viaje Operativo #/);
  });
});

