import { describe, expect, it } from 'vitest';
import { nextTick, shallowRef } from 'vue';
import { Frecuencia, ParadaIntermedia, type DiaOperacion } from '../../Domain/Entities/Frecuencia';
import { useHabilitarRutaFormValidation } from './useHabilitarRutaFormValidation';

const HOY = '2026-11-10'; // martes
const MANANA = '2026-11-11'; // miércoles

const crearFrecuencia = (id: number, dias: DiaOperacion[], conParadas = false): Frecuencia => {
  const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:30', `FR-${id}`, !conParadas, dias);
  frecuencia.id = id;
  if (conParadas) {
    frecuencia.establecerParadas([
      new ParadaIntermedia('Latacunga', 1, 120),
      new ParadaIntermedia('Riobamba', 2, 240),
    ]);
  }
  return frecuencia;
};

const crear = (frecuencias: Frecuencia[] = []) => {
  const lista = shallowRef<Frecuencia[]>(frecuencias);
  const composable = useHabilitarRutaFormValidation({
    frecuencias: () => lista.value,
    esDiaOperativo: (frecuencia, fecha) => {
      const dia: DiaOperacion = fecha === HOY ? 'Martes' : 'Miercoles';
      return frecuencia.opera(dia);
    },
    hoy: () => HOY,
  });
  return { ...composable, lista };
};

describe('useHabilitarRutaFormValidation', () => {
  it('nace limpio, con la fecha de hoy y sin errores visibles', () => {
    const { formulario, erroresVisibles, esValido } = crear();

    expect(formulario.fecha).toBe(HOY);
    expect(formulario.esDirecta).toBe(true);
    expect(esValido.value).toBe(false);
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('al intentar enviar vacío marca frecuencia y unidad como obligatorias y bloquea el envío', () => {
    const { validarTodo, erroresVisibles } = crear();

    expect(validarTodo()).toBe(false);
    expect(erroresVisibles.value.frecuenciaId).toBe('Selecciona una frecuencia');
    expect(erroresVisibles.value.busId).toBe('Selecciona una unidad');
    expect(erroresVisibles.value.fecha).toBe('');
  });

  it('valida la fecha en tiempo real: obligatoria y no anterior a hoy', () => {
    const { formulario, erroresVisibles } = crear();

    formulario.fecha = '2026-11-09';
    expect(erroresVisibles.value.fecha).toBe('La fecha no puede ser anterior a hoy');

    formulario.fecha = '';
    expect(erroresVisibles.value.fecha).toBe('La fecha del viaje es obligatoria');

    formulario.fecha = MANANA;
    expect(erroresVisibles.value.fecha).toBe('');
  });

  it('autocompleta modalidad y tiempo de viaje al elegir una frecuencia con paradas', async () => {
    const { formulario, erroresVisibles } = crear([crearFrecuencia(1, ['Martes'], true)]);

    formulario.frecuenciaId = 1;
    await nextTick();

    expect(formulario.esDirecta).toBe(false);
    expect(formulario.tiempoViajeMinutos).toBe('240');
    // Los valores propuestos no se marcan como "tocados": no aparecen errores nuevos.
    expect(erroresVisibles.value.tiempoViajeMinutos).toBe('');
  });

  it('una frecuencia directa sin paradas deja el tiempo vacío', async () => {
    const { formulario } = crear([crearFrecuencia(2, ['Martes'])]);
    formulario.tiempoViajeMinutos = '99';

    formulario.frecuenciaId = 2;
    await nextTick();

    expect(formulario.esDirecta).toBe(true);
    expect(formulario.tiempoViajeMinutos).toBe('');
  });

  it('avisa junto a la frecuencia cuando no opera en la fecha elegida', async () => {
    const { formulario, erroresVisibles, validarTodo } = crear([crearFrecuencia(3, ['Martes'])]);
    formulario.frecuenciaId = 3;
    await nextTick();
    expect(erroresVisibles.value.frecuenciaId).toBe('');

    formulario.fecha = MANANA;

    expect(erroresVisibles.value.frecuenciaId).toBe('La frecuencia seleccionada no opera en la fecha elegida');
    formulario.busId = 4;
    expect(validarTodo()).toBe(false);
  });

  it('valida tiempo de viaje y observación', () => {
    const { formulario, erroresVisibles } = crear();

    formulario.tiempoViajeMinutos = '-3';
    formulario.observacionChofer = 'x'.repeat(201);

    expect(erroresVisibles.value.tiempoViajeMinutos).toContain('entero de minutos');
    expect(erroresVisibles.value.observacionChofer).toContain('200');
  });

  it('con datos válidos permite enviar y arma el input del caso de uso', async () => {
    const { formulario, validarTodo, aInput } = crear([crearFrecuencia(1, ['Martes'], true)]);
    formulario.frecuenciaId = 1;
    await nextTick();
    formulario.busId = 7;
    formulario.choferId = 'uuid-9';
    formulario.observacionChofer = '  Salida especial  ';

    expect(validarTodo()).toBe(true);
    expect(aInput()).toEqual({
      frecuenciaId: 1,
      busId: 7,
      fecha: HOY,
      choferId: 'uuid-9',
      esDirecta: false,
      horaSalida: '08:30',
      observacionChofer: 'Salida especial',
      tiempoViajeMinutos: 240,
    });
  });

  it('sin chofer, observación ni tiempo envía esos campos como indefinidos', async () => {
    const { formulario, aInput } = crear([crearFrecuencia(2, ['Martes'])]);
    formulario.frecuenciaId = 2;
    await nextTick();
    formulario.busId = 1;

    expect(aInput()).toMatchObject({
      choferId: undefined,
      observacionChofer: undefined,
      tiempoViajeMinutos: undefined,
    });
  });

  it('iniciar() limpia el formulario y los errores, y admite una fecha por defecto', () => {
    const { formulario, iniciar, validarTodo, erroresVisibles } = crear();
    validarTodo();
    formulario.busId = 4;

    iniciar(MANANA);

    expect(formulario.busId).toBe('');
    expect(formulario.fecha).toBe(MANANA);
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('una frecuencia directa no admite desmarcar "servicio directo": no tiene paradas intermedias', async () => {
    const { formulario, erroresVisibles, validarTodo } = crear([crearFrecuencia(2, ['Martes'])]);
    formulario.frecuenciaId = 2;
    await nextTick();
    formulario.busId = 4;
    expect(formulario.esDirecta).toBe(true);

    formulario.esDirecta = false;

    expect(erroresVisibles.value.esDirecta).toBe('Una frecuencia directa no tiene paradas intermedias');
    expect(validarTodo()).toBe(false);
  });

  it('una frecuencia con paradas sí puede salir directa ese día', async () => {
    const { formulario, validarTodo } = crear([crearFrecuencia(1, ['Martes'], true)]);
    formulario.frecuenciaId = 1;
    await nextTick();
    formulario.busId = 4;

    formulario.esDirecta = true;

    expect(validarTodo()).toBe(true);
  });
});
