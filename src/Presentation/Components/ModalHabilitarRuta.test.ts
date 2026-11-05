import { describe, expect, it } from 'vitest';
import ModalHabilitarRuta from './ModalHabilitarRuta.vue';
import { renderizar } from '../testing/renderizarSsr';
import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { Bus } from '../../Domain/Entities/Bus';

describe('ModalHabilitarRuta Component', () => {
  const frecuenciaEjemplo = new Frecuencia(
    1,
    'Quito',
    'Guayaquil',
    '08:00',
    'FR-01',
    true,
    ['Lunes', 'Martes', 'Miércoles']
  );
  frecuenciaEjemplo.id = 1;

  const busEjemplo = new Bus(1, '25', 'PBA-1234', 40, 'UnPiso');
  busEjemplo.id = 10;

  it('cerrado: no renderiza el formulario', async () => {
    const { html, cuerpo } = await renderizar(ModalHabilitarRuta, { modelValue: false });

    expect(html).not.toContain('form-habilitar-ruta');
    expect(cuerpo).not.toContain('form-habilitar-ruta');
  });

  it('abierto: muestra los campos del formulario de programación', async () => {
    const { cuerpo } = await renderizar(ModalHabilitarRuta, {
      modelValue: true,
      frecuencias: [frecuenciaEjemplo],
      buses: [busEjemplo],
    });

    expect(cuerpo).toContain('id="form-habilitar-ruta"');
    expect(cuerpo).toContain('Frecuencia / Horario');
    expect(cuerpo).toContain('Fecha de Viaje');
    expect(cuerpo).toContain('Unidad / Bus');
    expect(cuerpo).toContain('Chofer Asignado');
    expect(cuerpo).toContain('Quito → Guayaquil (08:00)');
    expect(cuerpo).toContain('Bus #25 (PBA-1234)');
    expect(cuerpo).toContain('Programar Ruta');
    expect(cuerpo).toContain('Cancelar');
  });

  it('estado de error: muestra el banner con role="alert"', async () => {
    const { cuerpo } = await renderizar(ModalHabilitarRuta, {
      modelValue: true,
      frecuencias: [frecuenciaEjemplo],
      buses: [busEjemplo],
      error: 'La unidad ya tiene un viaje asignado en este horario.',
    });

    expect(cuerpo).toContain('role="alert"');
    expect(cuerpo).toContain('La unidad ya tiene un viaje asignado en este horario.');
  });

  it('estado de carga: deshabilita las acciones y muestra spinner', async () => {
    const { cuerpo } = await renderizar(ModalHabilitarRuta, {
      modelValue: true,
      frecuencias: [frecuenciaEjemplo],
      buses: [busEjemplo],
      loading: true,
    });

    expect(cuerpo).toContain('animate-spin');
    expect(cuerpo).toMatch(/disabled/);
  });

  it('estado vacío de frecuencias: muestra mensaje orientativo al usuario', async () => {
    const { cuerpo } = await renderizar(ModalHabilitarRuta, {
      modelValue: true,
      frecuencias: [],
      buses: [busEjemplo],
    });

    expect(cuerpo).toContain('role="status"');
    expect(cuerpo).toContain('No se encontraron frecuencias activas');
  });
});

