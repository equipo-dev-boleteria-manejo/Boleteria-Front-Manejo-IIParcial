import { describe, expect, it, vi } from 'vitest';
import { Ruta } from '../../Domain/Entities/Ruta';
import { cargarRutasAdyacentes } from './ocupacionRutas';

const crearRuta = (id: number, fecha: string) => {
  const ruta = new Ruta(1, 10, fecha);
  ruta.id = id;
  return ruta;
};

describe('cargarRutasAdyacentes', () => {
  it('consulta el día anterior, el mismo día y el siguiente', async () => {
    const obtener = vi.fn(async (fecha: string) => [crearRuta(1, fecha)]);

    const dias = await cargarRutasAdyacentes('2026-11-30', obtener);

    expect(obtener.mock.calls.map(([fecha]) => fecha)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
    expect(dias.map((dia) => dia.desfaseDias)).toEqual([-1, 0, 1]);
    expect(dias.map((dia) => dia.rutas[0]?.fecha)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
  });

  it('usa las rutas del propio día si ya se conocen, y solo consulta los días vecinos', async () => {
    const obtener = vi.fn(async () => []);
    const delDia = [crearRuta(5, '2026-11-10')];

    const dias = await cargarRutasAdyacentes('2026-11-10', obtener, delDia);

    expect(obtener).toHaveBeenCalledTimes(2);
    expect(dias[1]?.rutas).toBe(delDia);
  });

  it('si el repositorio no devuelve nada, ese día queda sin rutas', async () => {
    const dias = await cargarRutasAdyacentes('2026-11-10', async () => undefined);

    expect(dias.map((dia) => dia.rutas)).toEqual([[], [], []]);
  });
});
