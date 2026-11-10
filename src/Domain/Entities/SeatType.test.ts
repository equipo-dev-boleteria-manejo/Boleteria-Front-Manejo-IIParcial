import { describe, expect, it } from 'vitest';
import { SeatType, SeatTypeFactory } from './SeatType';
import {
  PrecioNegativoException,
  ColorHexInvalidoException,
} from '../Exceptions/SeatTypeException';

describe('SeatType (Tipos de Asiento y Tarifas)', () => {
  it('valida datos correctos con formato hexadecimal y precio base', () => {
    const seatType = new SeatType('VIP', '#E74C3C', 15.0);
    expect(seatType.esValido()).toBe(true);
    expect(seatType.estaActivo()).toBe(true);
  });

  it('rechaza nombres menores a 3 caracteres o precios negativos', () => {
    expect(new SeatType('AB', '#E74C3C', 15.0).esValido()).toBe(false);
    expect(new SeatType('VIP', '#E74C3C', -5.0).esValido()).toBe(false);
    expect(new SeatType('VIP', 'invalido', 15.0).esValido()).toBe(false);
  });

  it('actualiza precio y color lanzando excepciones tipadas en caso de error', () => {
    const seatType = new SeatType('Normal', '#3498DB', 10.0);
    seatType.actualizarPrecio(12.5);
    expect(seatType.precioBase).toBe(12.5);

    expect(() => seatType.actualizarPrecio(-1)).toThrow(PrecioNegativoException);

    seatType.actualizarColor('#123456');
    expect(seatType.colorHex).toBe('#123456');

    expect(() => seatType.actualizarColor('rojo')).toThrow(ColorHexInvalidoException);
  });

  it('activa y desactiva el tipo de asiento', () => {
    const seatType = new SeatType('Ejecutivo', '#F39C12', 12.0);
    seatType.desactivar();
    expect(seatType.estaActivo()).toBe(false);

    seatType.activar();
    expect(seatType.estaActivo()).toBe(true);
  });

  it('la fábrica genera los tipos predefinidos del sistema', () => {
    const normal = SeatTypeFactory.crearNormal();
    const vip = SeatTypeFactory.crearVIP();
    const ejecutivo = SeatTypeFactory.crearEjecutivo();

    expect(normal.esValido()).toBe(true);
    expect(vip.esValido()).toBe(true);
    expect(ejecutivo.esValido()).toBe(true);
  });
});
