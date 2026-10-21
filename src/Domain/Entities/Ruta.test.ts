import { describe, expect, it } from 'vitest';
import { Ruta } from './Ruta';
import { EstadoRuta } from '../Constants/EstadosSistema';
import { RutaNoModificableException } from '../Exceptions/RutaException';

describe('Ruta (La Orden de Despacho / Viaje Operativo)', () => {
  it('se inicializa en estado Programada y asigna recursos válidos', () => {
    const ruta = new Ruta(1, 10, '2026-10-21');
    expect(ruta.esValida()).toBe(true);
    expect(ruta.estado).toBe(EstadoRuta.PROGRAMADA);
    expect(ruta.puedeModificarse()).toBe(true);
  });

  it('rechaza IDs o fecha inválidos', () => {
    expect(new Ruta(0, 10, '2026-10-21').esValida()).toBe(false);
    expect(new Ruta(1, -1, '2026-10-21').esValida()).toBe(false);
    expect(new Ruta(1, 10, 'fecha-invalida').esValida()).toBe(false);
  });

  it('controla el ciclo de vida del viaje: Programada -> EnCurso -> Finalizada', () => {
    const ruta = new Ruta(1, 10, '2026-10-21');
    ruta.id = 1;

    ruta.iniciarViaje();
    expect(ruta.estado).toBe(EstadoRuta.EN_CURSO);
    expect(ruta.puedeModificarse()).toBe(false);

    ruta.finalizarViaje();
    expect(ruta.estado).toBe(EstadoRuta.FINALIZADA);

    // No se puede reiniciar un viaje finalizado
    expect(() => ruta.iniciarViaje()).toThrow(RutaNoModificableException);
  });

  it('permite cancelar un viaje programado con motivo', () => {
    const ruta = new Ruta(1, 10, '2026-10-21');
    ruta.cancelarViaje('Falla mecánica en el bus');
    expect(ruta.estado).toBe(EstadoRuta.CANCELADA);
    expect(ruta.observacionChofer).toContain('Falla mecánica en el bus');
  });
});
