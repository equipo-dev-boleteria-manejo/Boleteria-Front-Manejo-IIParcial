import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GestionarFrecuenciasUseCase } from './GestionarFrecuencias';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import {
  FrecuenciaInvalidaException,
  FrecuenciaNoEncontradaException,
  ParadaInvalidaException,
  ParadaNoEncontradaException,
} from '../../Domain/Exceptions/FrecuenciaException';
import { crearFrecuenciaRepoMock, frecuenciaDePrueba } from '../testing/mocksFrecuencias';

describe('GestionarFrecuenciasUseCase', () => {
  let repo: IFrecuenciaRepository;
  let useCase: GestionarFrecuenciasUseCase;

  beforeEach(() => {
    repo = crearFrecuenciaRepoMock();
    useCase = new GestionarFrecuenciasUseCase(repo);
  });

  describe('consultas', () => {
    it('debe listar delegando los filtros al repositorio', async () => {
      const frecuencias = [frecuenciaDePrueba(1), frecuenciaDePrueba(2)];
      vi.mocked(repo.obtenerTodas).mockResolvedValue(frecuencias);

      const resultado = await useCase.listar({ cooperativaId: 1, soloActivas: true });

      expect(resultado).toEqual(frecuencias);
      expect(repo.obtenerTodas).toHaveBeenCalledWith({ cooperativaId: 1, soloActivas: true });
    });

    it('debe obtener las frecuencias de una cooperativa y validar su identificador', async () => {
      vi.mocked(repo.obtenerPorCooperativa).mockResolvedValue([frecuenciaDePrueba(1)]);

      expect(await useCase.obtenerPorCooperativa(1)).toHaveLength(1);
      await expect(useCase.obtenerPorCooperativa(0)).rejects.toThrow(FrecuenciaInvalidaException);
    });

    it('debe obtener una frecuencia por ID y lanzar excepción si no existe', async () => {
      vi.mocked(repo.obtenerPorId).mockResolvedValueOnce(frecuenciaDePrueba(5));
      expect((await useCase.obtenerPorId(5)).id).toBe(5);

      vi.mocked(repo.obtenerPorId).mockResolvedValueOnce(null);
      await expect(useCase.obtenerPorId(6)).rejects.toThrow(FrecuenciaNoEncontradaException);
    });

    it.each([0, -1, 1.5, Number.NaN])('debe rechazar el ID inválido %s sin consultar el repositorio', async (id) => {
      await expect(useCase.obtenerPorId(id)).rejects.toThrow(FrecuenciaInvalidaException);

      expect(repo.obtenerPorId).not.toHaveBeenCalled();
    });

    it('debe buscar por tramo recortando los textos', async () => {
      vi.mocked(repo.buscarPorTramo).mockResolvedValue([frecuenciaDePrueba(1)]);

      await useCase.buscarPorTramo('  Quito ', 'Cuenca ', 'Lunes');

      expect(repo.buscarPorTramo).toHaveBeenCalledWith('Quito', 'Cuenca', 'Lunes');
    });

    it('debe rechazar la búsqueda sin origen o sin destino', async () => {
      await expect(useCase.buscarPorTramo('', 'Cuenca')).rejects.toThrow(FrecuenciaInvalidaException);
      await expect(useCase.buscarPorTramo('Quito', '   ')).rejects.toThrow(FrecuenciaInvalidaException);

      expect(repo.buscarPorTramo).not.toHaveBeenCalled();
    });
  });

  describe('actualizar, activar y desactivar', () => {
    it('debe actualizar delegando los cambios al repositorio', async () => {
      const actualizada = frecuenciaDePrueba(1, '09:00');
      vi.mocked(repo.actualizar).mockResolvedValue(actualizada);

      const resultado = await useCase.actualizar(1, { horaSalida: '09:00' });

      expect(resultado).toBe(actualizada);
      expect(repo.actualizar).toHaveBeenCalledWith(1, { horaSalida: '09:00' });
    });

    it('debe rechazar una actualización sin cambios', async () => {
      await expect(useCase.actualizar(1, {})).rejects.toThrow(FrecuenciaInvalidaException);

      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it('debe propagar el error del repositorio si la actualización deja la frecuencia inválida', async () => {
      vi.mocked(repo.actualizar).mockRejectedValue(new FrecuenciaInvalidaException());

      await expect(useCase.actualizar(1, { ciudadDestino: 'Quito' })).rejects.toThrow(FrecuenciaInvalidaException);
    });

    it('debe activar marcando la frecuencia como activa', async () => {
      vi.mocked(repo.actualizar).mockResolvedValue(frecuenciaDePrueba(1));

      await useCase.activar(1);

      expect(repo.actualizar).toHaveBeenCalledWith(1, { activa: true });
    });

    it('debe desactivar solo si la frecuencia existe', async () => {
      vi.mocked(repo.obtenerPorId).mockResolvedValueOnce(frecuenciaDePrueba(1));
      await useCase.desactivar(1);
      expect(repo.desactivar).toHaveBeenCalledWith(1);

      vi.mocked(repo.obtenerPorId).mockResolvedValueOnce(null);
      await expect(useCase.desactivar(2)).rejects.toThrow(FrecuenciaNoEncontradaException);
      expect(repo.desactivar).toHaveBeenCalledTimes(1);
    });
  });

  describe('paradas', () => {
    it('debe agregar una parada válida construyendo la entidad de dominio', async () => {
      vi.mocked(repo.agregarParada).mockImplementation(async (_id, parada) => parada);

      const resultado = await useCase.agregarParada(1, { ciudad: ' Ambato ', orden: 3, minutosDesdeOrigen: 300 });

      expect(resultado).toBeInstanceOf(ParadaIntermedia);
      expect(resultado.ciudad).toBe('Ambato');
      expect(resultado.permiteVenta).toBe(true);
      expect(repo.agregarParada).toHaveBeenCalledWith(1, expect.any(ParadaIntermedia));
    });

    it('debe rechazar una parada inválida sin llamar al repositorio', async () => {
      await expect(useCase.agregarParada(1, { ciudad: '', orden: 1, minutosDesdeOrigen: 10 })).rejects.toThrow(
        ParadaInvalidaException,
      );
      await expect(useCase.agregarParada(1, { ciudad: 'Ambato', orden: 1, minutosDesdeOrigen: -5 })).rejects.toThrow(
        ParadaInvalidaException,
      );

      expect(repo.agregarParada).not.toHaveBeenCalled();
    });

    it('debe actualizar una parada y rechazar cambios vacíos', async () => {
      vi.mocked(repo.actualizarParada).mockResolvedValue(new ParadaIntermedia('Ambato', 3, 310));

      await useCase.actualizarParada(7, { minutosDesdeOrigen: 310 });

      expect(repo.actualizarParada).toHaveBeenCalledWith(7, { minutosDesdeOrigen: 310 });
      await expect(useCase.actualizarParada(7, {})).rejects.toThrow(ParadaInvalidaException);
    });

    it('debe propagar ParadaNoEncontradaException del repositorio', async () => {
      vi.mocked(repo.actualizarParada).mockRejectedValue(new ParadaNoEncontradaException(7));

      await expect(useCase.actualizarParada(7, { orden: 2 })).rejects.toThrow(ParadaNoEncontradaException);
    });

    it('debe eliminar una parada validando su ID', async () => {
      await useCase.eliminarParada(7);
      expect(repo.eliminarParada).toHaveBeenCalledWith(7);

      await expect(useCase.eliminarParada(0)).rejects.toThrow(FrecuenciaInvalidaException);
      expect(repo.eliminarParada).toHaveBeenCalledTimes(1);
    });
  });
});
