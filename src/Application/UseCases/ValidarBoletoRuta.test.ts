import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidarBoletoRuta } from './ValidarBoletoRuta';
import type { IAbordajeBoletosRepository } from '../../Domain/Repositories/IAbordajeBoletosRepository';
import { Boleto } from '../../Domain/Entities/Boleto';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBoleto, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  RutaInvalidaException,
  RutaEstadoInvalidoException,
  BoletoNoValidoParaRutaException,
} from '../../Domain/Exceptions/RutaException';

const crearRutaEnCurso = (): Ruta => {
  const ruta = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
  ruta.id = 1;
  return ruta;
};

const crearBoleto = (extras: Partial<Boleto> = {}): Boleto => {
  const boleto = new Boleto(5, 1, 12, '0926687856', 'Ana', 'Pérez', 10, undefined, EstadoBoleto.EMITIDO);
  boleto.id = 99;
  boleto.codigoQr = 'BOL-QR-99';
  return Object.assign(boleto, extras);
};

describe('ValidarBoletoRuta UseCase', () => {
  let useCase: ValidarBoletoRuta;
  let repo: { [K in keyof IAbordajeBoletosRepository]: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = {
      obtenerPorCodigo: vi.fn(),
      marcarAbordado: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new ValidarBoletoRuta(repo as unknown as IAbordajeBoletosRepository);
  });

  it('valida un boleto Emitido de la ruta y lo marca como abordado', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto());

    const res = await useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: '  BOL-QR-99 ' });

    expect(res).toEqual({ ok: true, mensaje: 'Boleto validado correctamente.', boletoId: 99 });
    expect(repo.obtenerPorCodigo).toHaveBeenCalledWith('BOL-QR-99');
    expect(repo.marcarAbordado).toHaveBeenCalledWith(99);
  });

  it('también acepta un boleto en estado Aprobado', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto({ estado: EstadoBoleto.APROBADO }));

    const res = await useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' });

    expect(res.ok).toBe(true);
  });

  it('execute() es un alias de ejecutar()', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto());

    const res = await useCase.execute({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' });

    expect(res.boletoId).toBe(99);
  });

  it('rechaza si la ruta es nula o no tiene identificador', async () => {
    await expect(useCase.ejecutar({ ruta: null, codigo: 'BOL-123' })).rejects.toThrow(RutaInvalidaException);

    const sinId = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    await expect(useCase.ejecutar({ ruta: sinId, codigo: 'BOL-123' })).rejects.toThrow(RutaInvalidaException);
  });

  it('rechaza si la ruta no está En Curso, sin consultar el boleto', async () => {
    const programada = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    programada.id = 1;

    await expect(useCase.ejecutar({ ruta: programada, codigo: 'BOL-123' })).rejects.toThrow(RutaEstadoInvalidoException);
    expect(repo.obtenerPorCodigo).not.toHaveBeenCalled();
  });

  it('rechaza un código vacío, sin consultar el boleto', async () => {
    await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: '   ' })).rejects.toThrow(
      BoletoNoValidoParaRutaException,
    );
    expect(repo.obtenerPorCodigo).not.toHaveBeenCalled();
  });

  it('rechaza un boleto que no existe', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(null);

    await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-INEXISTENTE' })).rejects.toThrow(
      'Boleto no encontrado.',
    );
    expect(repo.marcarAbordado).not.toHaveBeenCalled();
  });

  it('rechaza un boleto que pertenece a otra ruta', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto({ rutaId: 2 }));

    await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' })).rejects.toThrow(
      'El boleto no corresponde a esta ruta.',
    );
    expect(repo.marcarAbordado).not.toHaveBeenCalled();
  });

  it('rechaza un boleto que ya abordó, para que no pueda usarse dos veces', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto({ estado: EstadoBoleto.ABORDADO }));

    await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' })).rejects.toThrow(
      'El boleto ya fue utilizado para abordar.',
    );
    expect(repo.marcarAbordado).not.toHaveBeenCalled();
  });

  it.each([EstadoBoleto.RESERVADO, EstadoBoleto.PROCESO_VALIDACION, EstadoBoleto.CANCELADO, EstadoBoleto.NO_ABORDO])(
    'rechaza un boleto en estado %s porque no está habilitado para abordar',
    async (estado) => {
      repo.obtenerPorCodigo.mockResolvedValue(crearBoleto({ estado }));

      await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' })).rejects.toThrow(
        `El boleto no está habilitado para abordar (estado: ${estado}).`,
      );
      expect(repo.marcarAbordado).not.toHaveBeenCalled();
    },
  );

  it('rechaza un boleto sin identificador', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto({ id: undefined }));

    await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' })).rejects.toThrow(
      BoletoNoValidoParaRutaException,
    );
  });

  it('propaga el rechazo del repositorio si otro dispositivo lo validó antes', async () => {
    repo.obtenerPorCodigo.mockResolvedValue(crearBoleto());
    repo.marcarAbordado.mockRejectedValue(
      new BoletoNoValidoParaRutaException('El boleto ya fue utilizado o no está habilitado para abordar.'),
    );

    await expect(useCase.ejecutar({ ruta: crearRutaEnCurso(), codigo: 'BOL-QR-99' })).rejects.toThrow(
      'ya fue utilizado',
    );
  });
});
