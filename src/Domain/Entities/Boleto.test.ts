import { describe, expect, it } from 'vitest';
import { Boleto } from './Boleto';
import { EstadoBoleto, TipoPasajero } from '../Constants/EstadosSistema';
import { BoletoNoModificableException } from '../Exceptions/BoletoException';

describe('Boleto (Pasaje Emitido)', () => {
  it('se inicializa en estado Reservado con tipo General por defecto', () => {
    const boleto = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );

    expect(boleto.esValida()).toBe(true);
    expect(boleto.estado).toBe(EstadoBoleto.RESERVADO);
    expect(boleto.tipoPasajero).toBe(TipoPasajero.GENERAL);
    expect(boleto.puedeModificarse()).toBe(true);
  });

  it('rechaza cédulas o identificadores inválidos', () => {
    // Cédula que no tiene 10 dígitos numéricos
    const boletoCedulaInvalida = new Boleto(
      1,
      2,
      5,
      '1234',
      'Juan',
      'Perez',
      12.5,
    );
    expect(boletoCedulaInvalida.esValida()).toBe(false);

    // VentaId inválido
    const boletoVentaInvalida = new Boleto(
      0,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );
    expect(boletoVentaInvalida.esValida()).toBe(false);

    // AsientoId inválido
    const boletoAsientoInvalido = new Boleto(
      1,
      2,
      -1,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );
    expect(boletoAsientoInvalido.esValida()).toBe(false);

    // Precio negativo
    const boletoPrecioInvalido = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      -10,
    );
    expect(boletoPrecioInvalido.esValida()).toBe(false);
  });

  it('permite emitir un boleto asignando códigos QR y de barras', () => {
    const boleto = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );

    boleto.emitir('QR_DATA_BASE64', 'BARCODE_123456');

    expect(boleto.estado).toBe(EstadoBoleto.EMITIDO);
    expect(boleto.codigoQr).toBe('QR_DATA_BASE64');
    expect(boleto.codigoBarras).toBe('BARCODE_123456');
    expect(boleto.puedeModificarse()).toBe(false);
  });

  it('permite registrar abordaje de un boleto emitido', () => {
    const boleto = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );
    boleto.emitir();
    boleto.registrarAbordaje();

    expect(boleto.estado).toBe(EstadoBoleto.ABORDADO);
  });

  it('permite registrar no abordo de un boleto emitido', () => {
    const boleto = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );
    boleto.emitir();
    boleto.registrarNoAbordo();

    expect(boleto.estado).toBe(EstadoBoleto.NO_ABORDO);
  });

  it('no permite registrar abordaje de un boleto en estado reservado', () => {
    const boleto = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );
    expect(() => boleto.registrarAbordaje()).toThrow(BoletoNoModificableException);
  });

  it('permite cancelar el boleto y previene modificaciones posteriores', () => {
    const boleto = new Boleto(
      1,
      2,
      5,
      '1801234567',
      'Juan',
      'Perez',
      12.5,
    );
    boleto.cancelar();

    expect(boleto.estado).toBe(EstadoBoleto.CANCELADO);
    expect(() => boleto.emitir()).toThrow(BoletoNoModificableException);
    expect(() => boleto.cancelar()).toThrow(BoletoNoModificableException);
  });
});
