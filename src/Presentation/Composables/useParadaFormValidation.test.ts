import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useParadaFormValidation } from './useParadaFormValidation';

const crear = () => {
  const ordenes = ref<number[]>([1, 2]);
  const sugerido = ref(3);
  const composable = useParadaFormValidation({
    extremos: () => ['Quito', 'Cuenca'],
    ordenesExistentes: () => ordenes.value,
    ordenSugerido: () => sugerido.value,
  });
  return { ...composable, ordenes, sugerido };
};

describe('useParadaFormValidation', () => {
  it('nace con el orden sugerido y sin errores visibles', () => {
    const { formulario, erroresVisibles } = crear();

    expect(formulario.orden).toBe('3');
    expect(formulario.permiteVenta).toBe(true);
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('al intentar agregar vacío marca ciudad y minutos como obligatorios', () => {
    const { validarTodo, erroresVisibles } = crear();

    expect(validarTodo()).toBe(false);
    expect(erroresVisibles.value.ciudad).toBe('La ciudad de la parada es obligatoria');
    expect(erroresVisibles.value.minutosDesdeOrigen).toBe('Los minutos desde el origen son obligatorios');
    expect(erroresVisibles.value.orden).toBe('');
    expect(erroresVisibles.value.costoProporcional).toBe('');
  });

  it('valida en tiempo real ciudad extremo, orden repetido, minutos y costo', () => {
    const { formulario, erroresVisibles } = crear();

    formulario.ciudad = 'cuenca';
    formulario.orden = '2';
    formulario.minutosDesdeOrigen = '-1';
    formulario.costoProporcional = '1.999';

    expect(erroresVisibles.value.ciudad).toContain('origen ni el destino');
    expect(erroresVisibles.value.orden).toBe('Ya existe una parada con el orden 2');
    expect(erroresVisibles.value.minutosDesdeOrigen).toBe('Debe ser un número entero de 0 o más');
    expect(erroresVisibles.value.costoProporcional).toBe('Máximo 2 decimales');
  });

  it('con datos válidos permite agregar y arma el DTO numérico', () => {
    const { formulario, validarTodo, aDto } = crear();
    formulario.ciudad = ' Latacunga ';
    formulario.minutosDesdeOrigen = '120';
    formulario.costoProporcional = '';
    formulario.permiteVenta = false;

    expect(validarTodo()).toBe(true);
    expect(aDto()).toEqual({
      ciudad: 'Latacunga',
      orden: 3,
      minutosDesdeOrigen: 120,
      permiteVenta: false,
      costoProporcional: 0,
    });
  });

  it('limpiar() vacía los campos, vuelve a sugerir el orden y oculta los errores', () => {
    const { formulario, limpiar, validarTodo, erroresVisibles, sugerido } = crear();
    validarTodo();
    formulario.ciudad = 'Latacunga';
    sugerido.value = 4;

    limpiar();

    expect(formulario.ciudad).toBe('');
    expect(formulario.orden).toBe('4');
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('sugerirOrden() actualiza el orden sin borrar los errores de los demás campos', () => {
    const { formulario, sugerirOrden, erroresVisibles } = crear();
    formulario.ciudad = '9';

    sugerirOrden(5);

    expect(formulario.orden).toBe('5');
    expect(erroresVisibles.value.ciudad).not.toBe('');
    expect(erroresVisibles.value.orden).toBe('');
  });

  const paradaExistente = {
    id: 9,
    orden: 2,
    ciudad: 'Riobamba',
    tiempo: '4 h',
    minutosDesdeOrigen: 240,
    permiteVenta: false,
    costo: '—',
    costoProporcional: 0,
  };

  it('cargar() precarga la parada y el orden propio no cuenta como repetido', () => {
    const { formulario, cargar, estaEditando, editandoId, erroresVisibles, validarTodo, aDto } = crear();

    cargar(paradaExistente);

    expect(estaEditando.value).toBe(true);
    expect(editandoId.value).toBe(9);
    expect(formulario).toMatchObject({
      ciudad: 'Riobamba',
      orden: '2',
      minutosDesdeOrigen: '240',
      costoProporcional: '',
      permiteVenta: false,
    });
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
    expect(validarTodo()).toBe(true);
    expect(aDto()).toEqual({
      ciudad: 'Riobamba',
      orden: 2,
      minutosDesdeOrigen: 240,
      permiteVenta: false,
      costoProporcional: 0,
    });
  });

  it('al editar sigue rechazando el orden de otra parada', () => {
    const { formulario, cargar, erroresVisibles } = crear();
    cargar(paradaExistente);

    formulario.orden = '1';

    expect(erroresVisibles.value.orden).toBe('Ya existe una parada con el orden 1');
  });

  it('sugerirOrden() no pisa el orden mientras se edita, y limpiar() sale de la edición', () => {
    const { formulario, cargar, sugerirOrden, limpiar, estaEditando } = crear();
    cargar(paradaExistente);

    sugerirOrden(7);
    expect(formulario.orden).toBe('2');

    limpiar();
    expect(estaEditando.value).toBe(false);
    expect(formulario.ciudad).toBe('');
    expect(formulario.orden).toBe('3');
  });

  it('en edición detecta si hubo cambios respecto a la parada precargada', () => {
    const { formulario, cargar, hayCambios, limpiar } = crear();
    cargar(paradaExistente);

    expect(hayCambios.value).toBe(false);

    formulario.minutosDesdeOrigen = '250';
    expect(hayCambios.value).toBe(true);

    formulario.minutosDesdeOrigen = '240';
    expect(hayCambios.value).toBe(false);

    limpiar();
    expect(hayCambios.value).toBe(true);
  });
});
