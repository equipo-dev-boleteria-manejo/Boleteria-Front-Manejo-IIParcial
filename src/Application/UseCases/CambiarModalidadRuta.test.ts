import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CambiarModalidadRuta } from './CambiarModalidadRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { RutaNoModificableException } from '../../Domain/Exceptions/RutaException';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';

describe('CambiarModalidadRuta', () => {
  let rutaRepository: IRutaRepository;
  let useCase: CambiarModalidadRuta;

  beforeEach(() => {
    rutaRepository = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn(),
      obtenerPorChoferYFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };
    useCase = new CambiarModalidadRuta(rutaRepository);
  });

  it('cambia la modalidad de una ruta Programada', async () => {
    const ruta = new Ruta(1, 10, '2026-06-15', EstadoRuta.PROGRAMADA);
    ruta.id = 7;
    vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(ruta);
    vi.mocked(rutaRepository.actualizar).mockResolvedValue(ruta);

    await useCase.ejecutar(7, false);

    expect(rutaRepository.actualizar).toHaveBeenCalledWith(7, { esDirecta: false });
  });

  it.each([EstadoRuta.EN_CURSO, EstadoRuta.FINALIZADA])(
    'rechaza cambiar modalidad en estado %s',
    async (estado) => {
      const ruta = new Ruta(1, 10, '2026-06-15', estado);
      ruta.id = 7;
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(ruta);

      await expect(useCase.ejecutar(7, false)).rejects.toBeInstanceOf(
        RutaNoModificableException,
      );
      expect(rutaRepository.actualizar).not.toHaveBeenCalled();
    },
  );
});
