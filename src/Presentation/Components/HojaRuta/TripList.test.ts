// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TripList from './TripList.vue';
import { Bus } from '../../../Domain/Entities/Bus';
import { Frecuencia, ParadaIntermedia } from '../../../Domain/Entities/Frecuencia';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../../Domain/Constants/EstadosSistema';

const crearBus = (id: number, numero: string, placa: string): Bus => {
  const bus = new Bus(1, numero, placa, 40);
  bus.id = id;
  return bus;
};

const crearRuta = (id: number, busId: number, hora: string, estado: EstadoRuta, esDirecta: boolean): Ruta => {
  const ruta = new Ruta(1, busId, '2026-06-15', estado);
  ruta.id = id;
  ruta.horaSalida = hora;
  ruta.esDirecta = esDirecta;
  return ruta;
};

const programada = crearRuta(101, 10, '09:00', EstadoRuta.PROGRAMADA, true);
const enCurso = crearRuta(102, 20, '14:30', EstadoRuta.EN_CURSO, false);
const buses = [crearBus(10, '12', 'PBA-1234'), crearBus(20, '7', 'PBB-5678')];

const montar = (props: Record<string, unknown> = {}) =>
  mount(TripList, { props: { rutas: [], buses, ...props } });

describe('TripList', () => {
  it('estado vacío: muestra un mensaje amigable cuando no hay trayectos', () => {
    const wrapper = montar();

    expect(wrapper.text()).toContain('Sin trayectos asignados');
    expect(wrapper.text()).toContain('No se han vinculado buses a frecuencias');
    expect(wrapper.text()).toContain('0 trayectos');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('estado de carga: muestra el esqueleto accesible y no la tabla', () => {
    const wrapper = montar({ loading: true });

    expect(wrapper.find('[aria-label="Cargando datos"]').exists()).toBe(true);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('estado de error: muestra un aviso legible sobre la lista', () => {
    const wrapper = montar({ error: 'Error al consultar la base de datos de despacho.' });

    expect(wrapper.find('[role="alert"]').text()).toContain('Error al consultar la base de datos de despacho.');
  });

  it('con datos: ordena por hora y muestra bus, modalidad y estado legibles', () => {
    const wrapper = montar({ rutas: [enCurso, programada] });

    const filas = wrapper.findAll('tbody tr');
    expect(filas).toHaveLength(2);
    expect(filas[0].text()).toContain('09:00');
    expect(filas[1].text()).toContain('14:30');
    expect(wrapper.text()).toContain('2 trayectos');
    // Número y placa del bus, no su id interno.
    expect(wrapper.text()).toContain('Bus #12 (PBA-1234)');
    expect(wrapper.text()).toContain('Bus #7 (PBB-5678)');
    expect(wrapper.text()).toContain('Directo');
    expect(wrapper.text()).toContain('Con paradas');
    expect(wrapper.text()).toContain('Programada');
    // El estado de dominio "EnCurso" se muestra como "En curso".
    expect(wrapper.text()).toContain('En curso');
    expect(wrapper.text()).not.toContain('EnCurso');
  });

  it('una ruta programada ofrece iniciar, cancelar y cambiar la modalidad; una en curso solo finalizar', () => {
    const wrapper = montar({ rutas: [programada, enCurso] });

    expect(wrapper.find('[aria-label^="Iniciar el trayecto de las 09:00"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label^="Cancelar el trayecto de las 09:00"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label^="Cambiar la modalidad del trayecto de las 09:00"]').exists()).toBe(true);

    expect(wrapper.find('[aria-label^="Finalizar el trayecto de las 14:30"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label^="Iniciar el trayecto de las 14:30"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label^="Cambiar la modalidad del trayecto de las 14:30"]').exists()).toBe(false);
  });

  it('emite el trayecto al pulsar cada acción', async () => {
    const wrapper = montar({ rutas: [programada, enCurso] });

    await wrapper.find('[aria-label^="Cambiar la modalidad"]').trigger('click');
    await wrapper.find('[aria-label^="Iniciar el trayecto"]').trigger('click');
    await wrapper.find('[aria-label^="Cancelar el trayecto"]').trigger('click');
    await wrapper.find('[aria-label^="Finalizar el trayecto"]').trigger('click');

    expect(wrapper.emitted('toggle-directo')?.[0]).toEqual([programada]);
    expect(wrapper.emitted('iniciar-viaje')?.[0]).toEqual([programada]);
    expect(wrapper.emitted('cancelar-viaje')?.[0]).toEqual([programada]);
    expect(wrapper.emitted('finalizar-viaje')?.[0]).toEqual([enCurso]);
  });

  it('modo solo lectura: sin columna ni botones de acción', () => {
    const wrapper = montar({ rutas: [programada], readonly: true });

    expect(wrapper.text()).not.toContain('Acciones');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('sin la lista de buses, identifica la unidad por su id', () => {
    const wrapper = montar({ rutas: [programada], buses: [] });

    expect(wrapper.text()).toContain('Unidad #10');
  });

describe('TripList - viajes de otra fecha', () => {
  it('un trayecto programado para una fecha futura no se puede iniciar, y explica por qué', () => {
    const futura = new Ruta(1, 10, '2999-01-01', EstadoRuta.PROGRAMADA);
    futura.id = 200;
    futura.horaSalida = '09:00';
    const wrapper = montar({ rutas: [futura] });

    const iniciar = wrapper.find('[aria-label^="Iniciar el trayecto de las 09:00"]');
    expect(iniciar.attributes('disabled')).toBeDefined();
    expect(iniciar.attributes('title')).toBe('Solo se puede iniciar el día del viaje (2999-01-01).');
    // Cancelarlo sí es posible.
    expect(wrapper.find('[aria-label^="Cancelar el trayecto de las 09:00"]').attributes('disabled')).toBeUndefined();
  });

  it('un trayecto de una fecha pasada o de hoy se puede iniciar', () => {
    const wrapper = montar({ rutas: [programada] });

    expect(wrapper.find('[aria-label^="Iniciar el trayecto de las 09:00"]').attributes('disabled')).toBeUndefined();
  });
});

describe('TripList - modalidad según la frecuencia', () => {
  const frecuencia = (id: number, esDirecto: boolean) => {
    const f = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', `FR-${id}`, esDirecto);
    f.id = id;
    if (!esDirecto) f.establecerParadas([new ParadaIntermedia('Latacunga', 1, 90)]);
    return f;
  };
  const rutaDirecta = (frecuenciaId: number, hora: string) => {
    const ruta = new Ruta(frecuenciaId, 10, '2026-06-15', EstadoRuta.PROGRAMADA);
    ruta.id = 300 + frecuenciaId;
    ruta.horaSalida = hora;
    ruta.esDirecta = true;
    return ruta;
  };

  it('un trayecto de una frecuencia directa no ofrece "Cambiar": no tiene paradas a las que pasar', () => {
    const wrapper = montar({ rutas: [rutaDirecta(1, '09:00')], frecuencias: [frecuencia(1, true)] });

    expect(wrapper.text()).toContain('Directo');
    expect(wrapper.find('[aria-label^="Cambiar la modalidad"]').exists()).toBe(false);
  });

  it('un trayecto directo de una frecuencia con paradas sí ofrece "Cambiar"', () => {
    const wrapper = montar({ rutas: [rutaDirecta(2, '10:00')], frecuencias: [frecuencia(2, false)] });

    expect(wrapper.find('[aria-label^="Cambiar la modalidad del trayecto de las 10:00"]').exists()).toBe(true);
  });
});
});
