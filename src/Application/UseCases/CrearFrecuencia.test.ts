import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrearFrecuenciaUseCase } from './CrearFrecuencia';
import type { CrearFrecuenciaDto } from '../Dtos/CrearFrecuenciaDto';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { Frecuencia } from '../../Domain/Entities/Frecuencia';
import {
  FrecuenciaInvalidaException,
  IdentificadorFrecuenciaDuplicadoException,
  ParadaInvalidaException,
} from '../../Domain/Exceptions/FrecuenciaException';
import { crearFrecuenciaRepoMock } from '../testing/mocksFrecuencias';

describe('CrearFrecuenciaUseCase', () => {
  let repo: IFrecuenciaRepository;
  let useCase: CrearFrecuenciaUseCase;
  let dto: CrearFrecuenciaDto;

  beforeEach(() => {
    repo = crearFrecuenciaRepoMock();
    vi.mocked(repo.crear).mockImplementation(async (frecuencia: Frecuencia) => {
      frecuencia.id = 99;
      return frecuencia;
    });
    useCase = new CrearFrecuenciaUseCase(repo);

    dto = {
      cooperativaId: 1,
      ciudadOrigen: '  Quito ',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      identificadorFrecuencia: ' FR-001 ',
      codigoAnt: ' ANT-9 ',
      paradas: [
        { ciudad: 'Riobamba', orden: 2, minutosDesdeOrigen: 240, permiteVenta: false },
        { ciudad: 'Latacunga', orden: 1, minutosDesdeOrigen: 120, costoProporcional: 3.5 },
      ],
    };
  });

  it('debe crear la frecuencia normalizando textos y cargando las paradas', async () => {
    const resultado = await useCase.execute(dto);

    expect(repo.crear).toHaveBeenCalledTimes(1);
    expect(resultado.id).toBe(99);
    expect(resultado.ciudadOrigen).toBe('Quito');
    expect(resultado.identificadorFrecuencia).toBe('FR-001');
    expect(resultado.codigoAnt).toBe('ANT-9');
    expect(resultado.esDirecto).toBe(true);
    expect(resultado.diasOperacion).toHaveLength(7);
    expect(resultado.obtenerParadasOrdenadas().map((p) => p.ciudad)).toEqual(['Latacunga', 'Riobamba']);
    expect(resultado.obtenerParadasConVenta().map((p) => p.ciudad)).toEqual(['Latacunga']);
  });

  it('debe crear una frecuencia sin paradas cuando el DTO no las incluye', async () => {
    const resultado = await useCase.execute({ ...dto, paradas: undefined });

    expect(resultado.paradas).toHaveLength(0);
    expect(repo.crear).toHaveBeenCalledTimes(1);
  });

  it('debe funcionar de forma idéntica con el alias ejecutar()', async () => {
    const resultado = await useCase.ejecutar(dto);

    expect(resultado.id).toBe(99);
  });

  it.each([
    ['origen igual al destino', { ciudadDestino: 'quito' }],
    ['hora mal formada', { horaSalida: '25:99' }],
    ['identificador vacío', { identificadorFrecuencia: '   ' }],
    ['cooperativa inválida', { cooperativaId: 0 }],
    ['sin días de operación', { diasOperacion: [] }],
  ])('debe rechazar una frecuencia con %s sin llamar al repositorio', async (_caso, cambios) => {
    await expect(useCase.execute({ ...dto, ...cambios })).rejects.toThrow(FrecuenciaInvalidaException);

    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('debe rechazar paradas con orden repetido, tiempos que retroceden o en el origen', async () => {
    const casos: CrearFrecuenciaDto['paradas'][] = [
      [
        { ciudad: 'Latacunga', orden: 1, minutosDesdeOrigen: 120 },
        { ciudad: 'Riobamba', orden: 1, minutosDesdeOrigen: 240 },
      ],
      [
        { ciudad: 'Latacunga', orden: 1, minutosDesdeOrigen: 240 },
        { ciudad: 'Riobamba', orden: 2, minutosDesdeOrigen: 120 },
      ],
      [{ ciudad: 'quito', orden: 1, minutosDesdeOrigen: 10 }],
      [{ ciudad: 'Ambato', orden: 0, minutosDesdeOrigen: 10 }],
    ];

    for (const paradas of casos) {
      await expect(useCase.execute({ ...dto, paradas })).rejects.toThrow(ParadaInvalidaException);
    }
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('debe propagar el error del repositorio cuando el identificador ya existe', async () => {
    vi.mocked(repo.crear).mockRejectedValue(new IdentificadorFrecuenciaDuplicadoException('FR-001', 1));

    await expect(useCase.execute(dto)).rejects.toThrow(IdentificadorFrecuenciaDuplicadoException);
  });
});
