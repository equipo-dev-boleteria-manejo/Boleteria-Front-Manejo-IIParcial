import { describe, expect, it } from 'vitest';
import { useCampoValidado } from './useCampoValidado';
import { useTrayectoFormValidation } from './useTrayectoFormValidation';
import { validarCodigoBoleto, validarObservacionObligatoria } from './validacionRutas';

describe('useTrayectoFormValidation', () => {
  it('nace sin errores visibles y al enviar vacío pide frecuencia y unidad', () => {
    const { erroresVisibles, validarTodo, esValido } = useTrayectoFormValidation();

    expect(esValido.value).toBe(false);
    expect(erroresVisibles.value).toEqual({ frecuenciaId: '', busId: '' });

    expect(validarTodo()).toBe(false);
    expect(erroresVisibles.value.frecuenciaId).toBe('Selecciona una frecuencia');
    expect(erroresVisibles.value.busId).toBe('Selecciona una unidad');
  });

  it('valida en tiempo real cada select y permite enviar con ambos elegidos', () => {
    const { formulario, erroresVisibles, validarTodo, aDatos } = useTrayectoFormValidation();

    formulario.frecuenciaId = 4;
    expect(erroresVisibles.value.frecuenciaId).toBe('');
    expect(erroresVisibles.value.busId).toBe('');

    formulario.busId = 9;
    expect(validarTodo()).toBe(true);
    expect(aDatos()).toEqual({ frecuenciaId: 4, busId: 9 });
  });

  it('limpiar() deja el formulario vacío y sin errores tras un envío', () => {
    const { formulario, limpiar, validarTodo, erroresVisibles } = useTrayectoFormValidation();
    formulario.frecuenciaId = 4;
    formulario.busId = 9;
    validarTodo();

    limpiar();

    expect(formulario).toMatchObject({ frecuenciaId: '', busId: '' });
    expect(erroresVisibles.value).toEqual({ frecuenciaId: '', busId: '' });
  });
});

describe('useCampoValidado', () => {
  it('no muestra error al inicio, pero sí al intentar enviar vacío', () => {
    const { error, validarTodo } = useCampoValidado(validarObservacionObligatoria);

    expect(error.value).toBe('');
    expect(validarTodo()).toBe(false);
    expect(error.value).toBe('La observación es obligatoria');
  });

  it('valida mientras se escribe y recorta los espacios del texto final', () => {
    const { formulario, error, texto, validarTodo } = useCampoValidado(validarObservacionObligatoria);

    formulario.valor = 'ok';
    expect(error.value).toContain('al menos 5 caracteres');

    formulario.valor = '  Falla mecánica  ';
    expect(error.value).toBe('');
    expect(texto.value).toBe('Falla mecánica');
    expect(validarTodo()).toBe(true);
  });

  it('cada instancia tiene errores independientes', () => {
    const observacion = useCampoValidado(validarObservacionObligatoria);
    const codigo = useCampoValidado(validarCodigoBoleto);

    codigo.formulario.valor = 'BOL 1';

    expect(codigo.error.value).toBe('El código no puede contener espacios');
    expect(observacion.error.value).toBe('');
  });

  it('iniciar() vacía el campo y oculta el error', () => {
    const { formulario, error, iniciar, validarTodo } = useCampoValidado(validarObservacionObligatoria);
    validarTodo();
    formulario.valor = 'algo';

    iniciar();

    expect(formulario.valor).toBe('');
    expect(error.value).toBe('');
  });
});
