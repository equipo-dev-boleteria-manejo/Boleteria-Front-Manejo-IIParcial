import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useFrecuenciaFormValidation } from './useFrecuenciaFormValidation';

const llenarValido = (f: ReturnType<typeof useFrecuenciaFormValidation>['formulario']) => {
  f.ciudadOrigen = 'Quito';
  f.ciudadDestino = 'Cuenca';
  f.horaSalida = '08:30';
  f.identificadorFrecuencia = 'FR-001';
};

describe('useFrecuenciaFormValidation', () => {
  it('nace limpio: sin errores visibles aunque los campos obligatorios estén vacíos', () => {
    const { erroresVisibles, esValido, errores } = useFrecuenciaFormValidation();

    expect(esValido.value).toBe(false);
    expect(errores.value.ciudadOrigen).toBe('La ciudad de origen es obligatoria');
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('al intentar enviar vacío muestra en rojo todos los obligatorios y bloquea el envío', () => {
    const { validarTodo, erroresVisibles } = useFrecuenciaFormValidation();

    expect(validarTodo()).toBe(false);
    expect(erroresVisibles.value.ciudadOrigen).toBe('La ciudad de origen es obligatoria');
    expect(erroresVisibles.value.ciudadDestino).toBe('La ciudad de destino es obligatoria');
    expect(erroresVisibles.value.horaSalida).toBe('La hora de salida es obligatoria');
    expect(erroresVisibles.value.identificadorFrecuencia).toBe('El identificador es obligatorio');
    expect(erroresVisibles.value.diasOperacion).toBe('');
  });

  it('valida en tiempo real solo el campo que se está escribiendo', () => {
    const { formulario, erroresVisibles } = useFrecuenciaFormValidation();

    formulario.ciudadOrigen = 'Quito9';

    expect(erroresVisibles.value.ciudadOrigen).toBe('Solo se permiten letras, espacios, puntos y guiones');
    expect(erroresVisibles.value.ciudadDestino).toBe('');

    formulario.ciudadOrigen = 'Quito';
    expect(erroresVisibles.value.ciudadOrigen).toBe('');
  });

  it('muestra el error si el usuario escribe y vuelve a vaciar el campo', () => {
    const { formulario, erroresVisibles } = useFrecuenciaFormValidation();

    formulario.identificadorFrecuencia = 'FR-1';
    formulario.identificadorFrecuencia = '';

    expect(erroresVisibles.value.identificadorFrecuencia).toBe('El identificador es obligatorio');
  });

  it('el destino se revalida cuando cambia el origen', () => {
    const { formulario, erroresVisibles } = useFrecuenciaFormValidation();
    formulario.ciudadDestino = 'Quito';
    formulario.ciudadOrigen = 'Quito';

    expect(erroresVisibles.value.ciudadDestino).toBe('El destino debe ser distinto del origen');
  });

  it('exige al menos un día de operación', () => {
    const { formulario, erroresVisibles } = useFrecuenciaFormValidation();
    formulario.diasOperacion = [];

    expect(erroresVisibles.value.diasOperacion).toBe('Selecciona al menos un día de operación');
  });

  it('la cooperativa solo es obligatoria cuando la sesión no la trae', () => {
    const requiere = ref(false);
    const { formulario, errores } = useFrecuenciaFormValidation(() => requiere.value);

    expect(errores.value.cooperativaId).toBe('');

    requiere.value = true;
    expect(errores.value.cooperativaId).toContain('cooperativa válida');

    formulario.cooperativaId = '3';
    expect(errores.value.cooperativaId).toBe('');
  });

  it('es válido con los datos mínimos y arma un DTO sin espacios sobrantes', () => {
    const { formulario, validarTodo, aDto } = useFrecuenciaFormValidation();
    llenarValido(formulario);
    formulario.ciudadOrigen = '  Quito ';
    formulario.codigoAnt = ' ANT-1 ';

    expect(validarTodo()).toBe(true);
    expect(aDto(7)).toMatchObject({
      cooperativaId: 7,
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      identificadorFrecuencia: 'FR-001',
      codigoAnt: 'ANT-1',
      resolucionAnt: '',
      esDirecto: true,
    });
    expect(aDto(7).diasOperacion).toHaveLength(7);
  });

  it('iniciar() con datos precarga el formulario sin mostrar errores ni marcar campos', () => {
    const { formulario, iniciar, erroresVisibles, esValido, intentoEnvio } = useFrecuenciaFormValidation();

    iniciar({
      cooperativaId: 1,
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      identificadorFrecuencia: 'FR-001',
      codigoAnt: 'ANT-0145',
      esDirecto: false,
      diasOperacion: ['Lunes', 'Viernes'],
    });

    expect(formulario).toMatchObject({
      cooperativaId: '1',
      ciudadOrigen: 'Quito',
      codigoAnt: 'ANT-0145',
      resolucionAnt: '',
      esDirecto: false,
      diasOperacion: ['Lunes', 'Viernes'],
    });
    expect(esValido.value).toBe(true);
    expect(intentoEnvio.value).toBe(false);
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('iniciar() sin datos limpia el formulario y los errores de un intento anterior', () => {
    const { formulario, iniciar, validarTodo, erroresVisibles } = useFrecuenciaFormValidation();
    validarTodo();
    formulario.ciudadOrigen = 'Quito';

    iniciar();

    expect(formulario.ciudadOrigen).toBe('');
    expect(formulario.diasOperacion).toHaveLength(7);
    expect(Object.values(erroresVisibles.value).every((mensaje) => mensaje === '')).toBe(true);
  });

  it('al marcar como directa una frecuencia con paradas avisa que se eliminarán, sin bloquear el guardado', () => {
    const { formulario, iniciar, mensajeDirecto, erroresVisibles, validarTodo } = useFrecuenciaFormValidation();
    iniciar({
      cooperativaId: 1,
      identificadorFrecuencia: 'FR-001',
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      esDirecto: false,
      totalParadas: 2,
    });
    expect(mensajeDirecto.value).toBe('');

    formulario.esDirecto = true;

    expect(mensajeDirecto.value).toContain('se eliminarán sus 2 paradas intermedias');
    expect(erroresVisibles.value.esDirecto).toBe('');
    expect(validarTodo()).toBe(true);

    formulario.esDirecto = false;
    expect(mensajeDirecto.value).toBe('');
  });

  it('al registrar una frecuencia nueva puede ser directa sin restricciones', () => {
    const { formulario, errores } = useFrecuenciaFormValidation();
    formulario.esDirecto = true;

    expect(errores.value.esDirecto).toBe('');
  });

  it('en edición detecta si hubo cambios respecto a lo precargado', () => {
    const { formulario, iniciar, hayCambios } = useFrecuenciaFormValidation();
    iniciar({
      cooperativaId: 1,
      identificadorFrecuencia: 'FR-001',
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      esDirecto: false,
      diasOperacion: ['Viernes', 'Lunes'],
      codigoAnt: 'ANT-1',
    });

    expect(hayCambios.value).toBe(false);

    formulario.ciudadDestino = 'Loja';
    expect(hayCambios.value).toBe(true);

    formulario.ciudadDestino = 'Cuenca';
    expect(hayCambios.value).toBe(false);
  });

  it('no cuenta como cambio el orden de los días ni los espacios sobrantes', () => {
    const { formulario, iniciar, hayCambios } = useFrecuenciaFormValidation();
    iniciar({
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      identificadorFrecuencia: 'FR-001',
      diasOperacion: ['Viernes', 'Lunes'],
    });

    formulario.diasOperacion = ['Lunes', 'Viernes'];
    formulario.ciudadOrigen = ' Quito ';

    expect(hayCambios.value).toBe(false);

    formulario.diasOperacion = ['Lunes'];
    expect(hayCambios.value).toBe(true);
  });

  it('al registrar una frecuencia nueva siempre hay "cambios"', () => {
    const { hayCambios } = useFrecuenciaFormValidation();

    expect(hayCambios.value).toBe(true);
  });
});
