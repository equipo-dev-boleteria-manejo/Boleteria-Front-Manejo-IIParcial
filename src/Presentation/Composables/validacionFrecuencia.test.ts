import { describe, expect, it } from 'vitest';
import {
  MAX_CIUDAD,
  MAX_IDENTIFICADOR,
  validarCiudad,
  validarCiudadParada,
  validarCooperativa,
  validarCostoParada,
  validarDestino,
  validarDias,
  avisoDirecto,
  validarHora,
  validarIdentificador,
  validarMinutosParada,
  validarOrden,
  validarOrigen,
  validarTextoOpcional,
} from './validacionFrecuencia';

describe('validarCiudad / validarOrigen', () => {
  it.each(['Quito', 'Alausí', 'Santo Domingo de los Tsáchilas', 'San José de Chimbo', "O'Higgins", 'Sta. Elena'])(
    'acepta "%s"',
    (ciudad) => {
      expect(validarOrigen(ciudad)).toBe('');
    },
  );

  it('rechaza vacío o solo espacios', () => {
    expect(validarOrigen('')).toBe('La ciudad de origen es obligatoria');
    expect(validarOrigen('   ')).toBe('La ciudad de origen es obligatoria');
  });

  it.each(['Quito2', '123', '@Quito', 'Quito!'])('rechaza caracteres no permitidos en "%s"', (ciudad) => {
    expect(validarOrigen(ciudad)).toBe('Solo se permiten letras, espacios, puntos y guiones');
  });

  it('rechaza nombres más largos que la columna de la base', () => {
    expect(validarCiudad('A'.repeat(MAX_CIUDAD + 1), 'La ciudad')).toContain(`${MAX_CIUDAD}`);
    expect(validarCiudad('A'.repeat(MAX_CIUDAD), 'La ciudad')).toBe('');
  });
});

describe('validarDestino', () => {
  it('exige que sea distinto del origen sin distinguir mayúsculas ni tildes', () => {
    expect(validarDestino('Cuenca', 'Quito')).toBe('');
    expect(validarDestino('quito', 'Quito')).toBe('El destino debe ser distinto del origen');
    expect(validarDestino('Alausi', 'Alausí')).toBe('El destino debe ser distinto del origen');
  });

  it('no compara contra un origen vacío y valida la ciudad primero', () => {
    expect(validarDestino('Cuenca', '')).toBe('');
    expect(validarDestino('', 'Quito')).toBe('La ciudad de destino es obligatoria');
  });
});

describe('validarHora', () => {
  it.each(['00:00', '08:30', '23:59'])('acepta %s', (hora) => {
    expect(validarHora(hora)).toBe('');
  });

  it('exige la hora y su formato HH:mm', () => {
    expect(validarHora('')).toBe('La hora de salida es obligatoria');
    for (const hora of ['24:00', '8:30', '12:60', 'ab:cd', '08:30:00']) {
      expect(validarHora(hora)).toContain('Formato de hora inválido');
    }
  });
});

describe('validarIdentificador', () => {
  it.each(['FR-001', 'fr_001', 'A1', 'FR.01/B'])('acepta "%s"', (id) => {
    expect(validarIdentificador(id)).toBe('');
  });

  it('exige valor, formato y longitud máxima', () => {
    expect(validarIdentificador(' ')).toBe('El identificador es obligatorio');
    expect(validarIdentificador('-FR')).toContain('Solo letras, números');
    expect(validarIdentificador('FR 001')).toContain('Solo letras, números');
    expect(validarIdentificador('A'.repeat(MAX_IDENTIFICADOR + 1))).toContain(`${MAX_IDENTIFICADOR}`);
  });
});

describe('validarTextoOpcional, validarDias y validarCooperativa', () => {
  it('limita el largo de los textos opcionales', () => {
    expect(validarTextoOpcional('', 'El código ANT', 50)).toBe('');
    expect(validarTextoOpcional('A'.repeat(51), 'El código ANT', 50)).toBe('El código ANT no puede superar 50 caracteres');
  });

  it('exige al menos un día de operación', () => {
    expect(validarDias([])).toBe('Selecciona al menos un día de operación');
    expect(validarDias(['Lunes'])).toBe('');
  });

  it('exige una cooperativa entera positiva', () => {
    expect(validarCooperativa('1')).toBe('');
    expect(validarCooperativa(12)).toBe('');
    for (const valor of ['', '0', '-3', '1.5', 'abc']) {
      expect(validarCooperativa(valor)).toContain('cooperativa válida');
    }
  });
});

describe('validaciones de paradas', () => {
  it('la ciudad de la parada no puede ser el origen ni el destino', () => {
    expect(validarCiudadParada('Latacunga', ['Quito', 'Cuenca'])).toBe('');
    expect(validarCiudadParada('cuenca', ['Quito', 'Cuenca'])).toContain('origen ni el destino');
    expect(validarCiudadParada('', ['Quito'])).toBe('La ciudad de la parada es obligatoria');
  });

  it('el orden debe ser entero positivo y no repetirse', () => {
    expect(validarOrden('3', [1, 2])).toBe('');
    expect(validarOrden('', [])).toBe('El orden es obligatorio');
    expect(validarOrden('0', [])).toBe('Debe ser un número entero mayor a 0');
    expect(validarOrden('1.5', [])).toBe('Debe ser un número entero mayor a 0');
    expect(validarOrden('2', [1, 2])).toBe('Ya existe una parada con el orden 2');
  });

  it('los minutos deben ser enteros entre 0 y 24 horas', () => {
    expect(validarMinutosParada('0')).toBe('');
    expect(validarMinutosParada('120')).toBe('');
    expect(validarMinutosParada('')).toBe('Los minutos desde el origen son obligatorios');
    expect(validarMinutosParada('-5')).toBe('Debe ser un número entero de 0 o más');
    expect(validarMinutosParada('1.5')).toBe('Debe ser un número entero de 0 o más');
    expect(validarMinutosParada('1441')).toContain('1440');
  });

  it('el costo es opcional, no negativo y con máximo 2 decimales', () => {
    expect(validarCostoParada('')).toBe('');
    expect(validarCostoParada('0')).toBe('');
    expect(validarCostoParada('2.5')).toBe('');
    expect(validarCostoParada('-1')).toBe('Debe ser un monto de 0 o más');
    expect(validarCostoParada('1.999')).toBe('Máximo 2 decimales');
    expect(validarCostoParada('1001')).toContain('1000');
    expect(validarCostoParada('abc')).toBe('Debe ser un monto de 0 o más');
  });
});

describe('avisoDirecto', () => {
  it('avisa (sin ser un error) que guardar como directa elimina las paradas existentes', () => {
    expect(avisoDirecto(true, 0)).toBe('');
    expect(avisoDirecto(false, 3)).toBe('');
    expect(avisoDirecto(true, 1)).toBe(
      'Al guardar se eliminarán su parada intermedia, porque una frecuencia directa no las lleva.',
    );
    expect(avisoDirecto(true, 4)).toContain('sus 4 paradas intermedias');
  });
});
