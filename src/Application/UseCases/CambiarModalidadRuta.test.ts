import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CambiarModalidadRuta } from './CambiarModalidadRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import {
  RutaModalidadNoPermitidaException,
  RutaNoModificableException,
} from '../../Domain/Exceptions/RutaException';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
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

  describe('la modalidad "con paradas" depende de la frecuencia', () => {
    let frecuenciaRepository: IFrecuenciaRepository;
    let conFrecuencias: CambiarModalidadRuta;

    const crearRuta = (esDirecta: boolean) => {
      const ruta = new Ruta(3, 10, '2026-06-15', EstadoRuta.PROGRAMADA);
      ruta.id = 7;
      ruta.esDirecta = esDirecta;
      return ruta;
    };

    const crearFrecuencia = (esDirecto: boolean, paradas: number) => {
      const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FR-1', esDirecto);
      frecuencia.establecerParadas(
        Array.from({ length: paradas }, (_, i) => new ParadaIntermedia(`Ciudad${i}`, i + 1, 60 * (i + 1))),
      );
      return frecuencia;
    };

    beforeEach(() => {
      frecuenciaRepository = { obtenerPorId: vi.fn() } as unknown as IFrecuenciaRepository;
      conFrecuencias = new CambiarModalidadRuta(rutaRepository, frecuenciaRepository);
      vi.mocked(rutaRepository.actualizar).mockResolvedValue(crearRuta(false));
    });

    it('rechaza pasar a "con paradas" una ruta de una frecuencia directa', async () => {
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(crearRuta(true));
      vi.mocked(frecuenciaRepository.obtenerPorId).mockResolvedValue(crearFrecuencia(true, 0));

      await expect(conFrecuencias.ejecutar(7, false)).rejects.toBeInstanceOf(RutaModalidadNoPermitidaException);
      await expect(conFrecuencias.ejecutar(7, false)).rejects.toThrow('es directa: no tiene paradas intermedias');
      expect(frecuenciaRepository.obtenerPorId).toHaveBeenCalledWith(3);
      expect(rutaRepository.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza "con paradas" si la frecuencia, aun siendo con paradas, no tiene ninguna registrada', async () => {
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(crearRuta(true));
      vi.mocked(frecuenciaRepository.obtenerPorId).mockResolvedValue(crearFrecuencia(false, 0));

      await expect(conFrecuencias.ejecutar(7, false)).rejects.toBeInstanceOf(RutaModalidadNoPermitidaException);
    });

    it('permite pasar a "con paradas" cuando la frecuencia las tiene', async () => {
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(crearRuta(true));
      vi.mocked(frecuenciaRepository.obtenerPorId).mockResolvedValue(crearFrecuencia(false, 2));

      await conFrecuencias.ejecutar(7, false);

      expect(rutaRepository.actualizar).toHaveBeenCalledWith(7, { esDirecta: false });
    });

    it('siempre permite salir directo, incluso de una frecuencia con paradas, sin consultar la frecuencia', async () => {
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(crearRuta(false));

      await conFrecuencias.ejecutar(7, true);

      expect(rutaRepository.actualizar).toHaveBeenCalledWith(7, { esDirecta: true });
      expect(frecuenciaRepository.obtenerPorId).not.toHaveBeenCalled();
    });

    it('si la frecuencia ya no se encuentra, no bloquea el cambio', async () => {
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(crearRuta(true));
      vi.mocked(frecuenciaRepository.obtenerPorId).mockResolvedValue(null);

      await conFrecuencias.ejecutar(7, false);

      expect(rutaRepository.actualizar).toHaveBeenCalledWith(7, { esDirecta: false });
    });

    it('sin repositorio de frecuencias inyectado no valida la frecuencia (comportamiento anterior)', async () => {
      vi.mocked(rutaRepository.obtenerPorId).mockResolvedValue(crearRuta(true));

      await useCase.ejecutar(7, false);

      expect(rutaRepository.actualizar).toHaveBeenCalledWith(7, { esDirecta: false });
    });
  });
});
