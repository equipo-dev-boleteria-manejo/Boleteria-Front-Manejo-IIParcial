import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidarBoletoRuta } from './ValidarBoletoRuta';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  RutaInvalidaException,
  RutaEstadoInvalidoException,
  BoletoNoValidoParaRutaException,
} from '../../Domain/Exceptions/RutaException';

describe('ValidarBoletoRuta UseCase', () => {
  let useCase: ValidarBoletoRuta;
  let mockBoletosRepo: any;

  beforeEach(() => {
    mockBoletosRepo = {
      obtenerPorCodigo: vi.fn(),
      marcarAbordado: vi.fn(),
    };
    useCase = new ValidarBoletoRuta(mockBoletosRepo);
  });

  it('debe validar un boleto QR y marcarlo como abordado cuando la ruta está En Curso', async () => {
    const rutaEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rutaEnCurso.id = 1;

    mockBoletosRepo.obtenerPorCodigo.mockResolvedValue({
      id: 99,
      codigoQr: 'BOL-QR-99',
    });

    const res = await useCase.ejecutar({
      ruta: rutaEnCurso,
      codigo: 'BOL-QR-99',
    });

    expect(res.ok).toBe(true);
    expect(res.boletoId).toBe(99);
    expect(mockBoletosRepo.obtenerPorCodigo).toHaveBeenCalledWith('BOL-QR-99');
    expect(mockBoletosRepo.marcarAbordado).toHaveBeenCalledWith(99);
  });

  it('debe rechazar si la ruta es nula o no tiene identificador', async () => {
    await expect(
      useCase.ejecutar({
        ruta: null,
        codigo: 'BOL-123',
      })
    ).rejects.toThrow(RutaInvalidaException);
  });

  it('debe rechazar si la ruta no está En Curso', async () => {
    const rutaProgramada = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    rutaProgramada.id = 1;

    await expect(
      useCase.ejecutar({
        ruta: rutaProgramada,
        codigo: 'BOL-123',
      })
    ).rejects.toThrow(RutaEstadoInvalidoException);
  });

  it('debe rechazar si el código QR es vacío', async () => {
    const rutaEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rutaEnCurso.id = 1;

    await expect(
      useCase.ejecutar({
        ruta: rutaEnCurso,
        codigo: '   ',
      })
    ).rejects.toThrow(BoletoNoValidoParaRutaException);
  });

  it('debe rechazar si el boleto no existe en la base de datos', async () => {
    const rutaEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rutaEnCurso.id = 1;

    mockBoletosRepo.obtenerPorCodigo.mockResolvedValue(null);

    await expect(
      useCase.ejecutar({
        ruta: rutaEnCurso,
        codigo: 'BOL-INEXISTENTE',
      })
    ).rejects.toThrow(BoletoNoValidoParaRutaException);
  });
});
