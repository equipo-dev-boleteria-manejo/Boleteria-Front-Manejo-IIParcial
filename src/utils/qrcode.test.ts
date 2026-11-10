import { describe, expect, it } from 'vitest';
import { extraerCodigoBoleto } from './qrcode';

describe('extraerCodigoBoleto', () => {
  it('devuelve cadena vacía cuando no hay valor legible', () => {
    expect(extraerCodigoBoleto('')).toBe('');
    expect(extraerCodigoBoleto('   ')).toBe('');
    expect(extraerCodigoBoleto(undefined as unknown as string)).toBe('');
  });

  it('un código simple se devuelve sin espacios sobrantes', () => {
    expect(extraerCodigoBoleto('  BOL-2026-000123  ')).toBe('BOL-2026-000123');
  });

  it.each([
    ['CodigoQr', 'QR-1'],
    ['codigoQr', 'QR-2'],
    ['codigoQR', 'QR-3'],
    ['CodigoBarras', 'BAR-1'],
    ['codigoBarras', 'BAR-2'],
    ['codigo', 'COD-1'],
    ['code', 'CODE-1'],
  ])('si el QR trae un JSON con el campo %s, extrae su valor', (campo, valor) => {
    expect(extraerCodigoBoleto(JSON.stringify({ [campo]: valor }))).toBe(valor);
  });

  it('respeta el orden de prioridad cuando el JSON trae varios campos', () => {
    expect(extraerCodigoBoleto(JSON.stringify({ codigo: 'B', CodigoQr: 'A' }))).toBe('A');
  });

  it('si el JSON no trae ningún campo conocido, devuelve el texto leído', () => {
    expect(extraerCodigoBoleto('{"otro":"x"}')).toBe('{"otro":"x"}');
  });

  it('un texto que no es JSON válido se devuelve tal cual', () => {
    expect(extraerCodigoBoleto('{no-es-json')).toBe('{no-es-json');
    expect(extraerCodigoBoleto('null')).toBe('null');
    expect(extraerCodigoBoleto('12345')).toBe('12345');
  });
});
