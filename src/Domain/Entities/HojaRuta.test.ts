import { describe, expect, it } from 'vitest';
import { HojaRuta } from './HojaRuta';
import { EstadoHojaRuta } from '../Constants/EstadosSistema';
import { HojaRutaYaCerradaException } from '../Exceptions/HojaRutaException';

describe('HojaRuta (El Reporte Diario del Supervisor)', () => {
  it('se inicializa en estado Borrador con fecha válida', () => {
    const hoja = new HojaRuta('2026-10-21');
    expect(hoja.esValida()).toBe(true);
    expect(hoja.estado).toBe(EstadoHojaRuta.BORRADOR);
    expect(hoja.estaAbierta()).toBe(true);
  });

  it('rechaza fecha mal formada', () => {
    expect(new HojaRuta('').esValida()).toBe(false);
    expect(new HojaRuta('21-10-2026').esValida()).toBe(false);
    expect(new HojaRuta('invalida').esValida()).toBe(false);
  });

  it('permite emitir y cerrar la hoja de ruta', () => {
    const hoja = new HojaRuta('2026-10-21');
    hoja.emitir();
    expect(hoja.estado).toBe(EstadoHojaRuta.EMITIDA);
    expect(hoja.estaAbierta()).toBe(true);

    hoja.cerrar();
    expect(hoja.estado).toBe(EstadoHojaRuta.CERRADA);
    expect(hoja.estaAbierta()).toBe(false);
  });

  it('impide emitir una hoja de ruta ya cerrada', () => {
    const hoja = new HojaRuta('2026-10-21');
    hoja.id = 1;
    hoja.cerrar();
    expect(() => hoja.emitir()).toThrow(HojaRutaYaCerradaException);
  });
});
