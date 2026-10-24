import { describe, expect, it } from 'vitest';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import { InvalidCedulaException } from '../../Domain/Exceptions/InvalidCedulaException';
import { DomainException } from '../../Domain/Exceptions/DomainException';

describe('CalcularDescuentoVenta (Caso de Uso)', () => {
  const casoDeUso = new CalcularDescuentoVenta();

  it('no aplica descuento cuando el pasajero no es menor ni adulto mayor ni discapacitado', () => {
    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 30,
      tieneDiscapacidad: false,
      precioBase: 10,
    });

    expect(resultado.categoria).toBe('SIN_DESCUENTO');
    expect(resultado.porcentajeDescuento).toBe(0);
    expect(resultado.montoDescuento).toBe(0);
    expect(resultado.precioFinal).toBe(10);
  });

  it('aplica descuento del 30% a menores de edad', () => {
    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 17,
      tieneDiscapacidad: false,
      precioBase: 20,
    });

    expect(resultado.categoria).toBe('MENOR');
    expect(resultado.porcentajeDescuento).toBe(0.3);
    expect(resultado.montoDescuento).toBe(6);
    expect(resultado.precioFinal).toBe(14);
  });

  it('aplica descuento de tercera edad (50%) a mayores o iguales a 65 años', () => {
    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 65,
      tieneDiscapacidad: false,
      precioBase: 40,
    });

    expect(resultado.categoria).toBe('TERCERA_EDAD');
    expect(resultado.porcentajeDescuento).toBe(0.5);
    expect(resultado.montoDescuento).toBe(20);
    expect(resultado.precioFinal).toBe(20);
  });

  it('aplica descuento por discapacidad (50%)', () => {
    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 40,
      tieneDiscapacidad: true,
      precioBase: 30,
    });

    expect(resultado.categoria).toBe('DISCAPACIDAD');
    expect(resultado.porcentajeDescuento).toBe(0.5);
    expect(resultado.montoDescuento).toBe(15);
    expect(resultado.precioFinal).toBe(15);
  });

  it('cuando existe tercera edad y discapacidad aplica solo el de mayor prioridad sin acumular', () => {
    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 70,
      tieneDiscapacidad: true,
      precioBase: 50,
    });

    expect(resultado.porcentajeDescuento).toBe(0.5);
    expect(resultado.montoDescuento).toBe(25);
    expect(resultado.precioFinal).toBe(25);
    expect(resultado.categoria).toBe('DISCAPACIDAD');
  });

  it('rechaza una cédula con dígito verificador inválido', () => {
    expect(() =>
      casoDeUso.ejecutar({
        numeroCedula: '1710000008',
        edad: 30,
        tieneDiscapacidad: false,
        precioBase: 10,
      })
    ).toThrow(InvalidCedulaException);
  });

  it('rechaza una edad negativa o inválida', () => {
    expect(() =>
      casoDeUso.ejecutar({
        numeroCedula: '1710000009',
        edad: -5,
        tieneDiscapacidad: false,
        precioBase: 10,
      })
    ).toThrow(DomainException);
  });

  it('rechaza un precio base menor o igual a cero', () => {
    expect(() =>
      casoDeUso.ejecutar({
        numeroCedula: '1710000009',
        edad: 25,
        tieneDiscapacidad: false,
        precioBase: 0,
      })
    ).toThrow(DomainException);
  });
});
