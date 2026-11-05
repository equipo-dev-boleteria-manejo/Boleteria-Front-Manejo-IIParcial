import { describe, expect, it } from 'vitest';
import TripList from './TripList.vue';
import { renderizar } from '../../testing/renderizarSsr';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../../Domain/Constants/EstadosSistema';

describe('TripList Component', () => {
  const ruta1 = new Ruta(1, 10, '2026-06-15', EstadoRuta.PROGRAMADA);
  ruta1.id = 101;
  ruta1.horaSalida = '09:00';
  ruta1.esDirecta = true;

  const ruta2 = new Ruta(2, 20, '2026-06-15', EstadoRuta.EN_CURSO);
  ruta2.id = 102;
  ruta2.horaSalida = '14:30';
  ruta2.esDirecta = false;

  it('estado vacío: muestra mensaje amigable cuando no hay trayectos', async () => {
    const { html } = await renderizar(TripList, {
      rutas: [],
    });

    expect(html).toContain('Sin trayectos asignados');
    expect(html).toContain('No se han vinculado buses a frecuencias');
    expect(html).toContain('0 trayectos');
  });

  it('estado de carga: muestra skeletons de carga', async () => {
    const { html } = await renderizar(TripList, {
      rutas: [],
      loading: true,
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('Cargando trayectos operativos...');
    expect(html).toContain('animate-pulse');
  });

  it('estado de error: muestra banner de error legible', async () => {
    const { html } = await renderizar(TripList, {
      rutas: [],
      error: 'Error al consultar la base de datos de despacho.',
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('Error al consultar la base de datos de despacho.');
  });

  it('estado de éxito con datos: renderiza la tabla con los trayectos ordenados', async () => {
    const { html } = await renderizar(TripList, {
      rutas: [ruta2, ruta1],
    });

    expect(html).toContain('2 trayectos');
    expect(html).toContain('09:00');
    expect(html).toContain('14:30');
    expect(html).toContain('Unidad #10');
    expect(html).toContain('Unidad #20');
    expect(html).toContain('Directo');
    expect(html).toContain('Con Paradas');
    expect(html).toContain('Programada');
    expect(html).toContain('EnCurso');
    expect(html).toContain('Iniciar');
    expect(html).toContain('Finalizar');
  });

  it('modo solo lectura (readonly): oculta columna de acciones', async () => {
    const { html } = await renderizar(TripList, {
      rutas: [ruta1],
      readonly: true,
    });

    expect(html).not.toContain('Iniciar');
    expect(html).not.toContain('Cancelar');
  });
});

