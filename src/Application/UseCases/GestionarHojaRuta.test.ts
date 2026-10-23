import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GestionarHojaRuta } from './GestionarHojaRuta';
import type { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { EstadoHojaRuta, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';

describe('GestionarHojaRuta UseCase', () => {
  let useCase: GestionarHojaRuta;
  let mockHojaRutaRepo: IHojaRutaRepository;
  let mockFrecuenciaRepo: IFrecuenciaRepository;
  let mockRutaRepo: IRutaRepository;

  beforeEach(() => {
    mockHojaRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
    };

    mockFrecuenciaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorCooperativa: vi.fn(),
      obtenerPorIdentificador: vi.fn(),
      buscarPorTramo: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
      obtenerParadas: vi.fn(),
      agregarParada: vi.fn(),
      actualizarParada: vi.fn(),
      eliminarParada: vi.fn(),
    };

    mockRutaRepo = {
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

    useCase = new GestionarHojaRuta(mockHojaRutaRepo, mockFrecuenciaRepo, mockRutaRepo);
  });

  it('debe listar hojas de ruta por fecha válida', async () => {
    const hoja = new HojaRuta('2026-06-15', EstadoHojaRuta.BORRADOR);
    hoja.id = 1;
    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(hoja);

    const resultado = await useCase.listarPorFecha('2026-06-15');

    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.id).toBe(1);
    expect(mockHojaRutaRepo.obtenerPorFecha).toHaveBeenCalledWith('2026-06-15');
  });

  it('debe rechazar listar si la fecha no es válida', async () => {
    await expect(useCase.listarPorFecha('fecha-invalida')).rejects.toThrow(DomainException);
  });

  it('debe retornar hoja existente si ya existe una para esa fecha al llamar crearHojaDia', async () => {
    const hojaExistente = new HojaRuta('2026-06-15', EstadoHojaRuta.BORRADOR);
    hojaExistente.id = 10;
    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(hojaExistente);

    const resultado = await useCase.crearHojaDia('2026-06-15', 'usr-1');

    expect(resultado.id).toBe(10);
    expect(mockHojaRutaRepo.crear).not.toHaveBeenCalled();
  });

  it('debe crear una nueva hoja de ruta si no existe ninguna para esa fecha', async () => {
    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(null);

    const nuevaHoja = new HojaRuta('2026-06-15', EstadoHojaRuta.BORRADOR);
    nuevaHoja.id = 11;
    nuevaHoja.usuarioCreadorId = 'usr-1';
    vi.mocked(mockHojaRutaRepo.crear).mockResolvedValue(nuevaHoja);

    const resultado = await useCase.crearHojaDia('2026-06-15', 'usr-1');

    expect(resultado.id).toBe(11);
    expect(mockHojaRutaRepo.crear).toHaveBeenCalled();
  });

  it('debe iniciar la ruta cambiando su estado a EMITIDA', async () => {
    const hojaEmitida = new HojaRuta('2026-06-15', EstadoHojaRuta.EMITIDA);
    hojaEmitida.id = 1;
    vi.mocked(mockHojaRutaRepo.cambiarEstado).mockResolvedValue(hojaEmitida);

    const resultado = await useCase.iniciarRuta(1);

    expect(resultado.estado).toBe(EstadoHojaRuta.EMITIDA);
    expect(mockHojaRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoHojaRuta.EMITIDA);
  });

  it('debe finalizar la ruta cerrando la hoja y completando las rutas abiertas', async () => {
    const hojaCerrada = new HojaRuta('2026-06-15', EstadoHojaRuta.CERRADA);
    hojaCerrada.id = 1;
    vi.mocked(mockHojaRutaRepo.cambiarEstado).mockResolvedValue(hojaCerrada);

    const rutaAbierta = new Ruta(1, 10, '2026-06-15', EstadoRuta.PROGRAMADA);
    rutaAbierta.id = 100;
    vi.mocked(mockRutaRepo.obtenerPorHojaRuta).mockResolvedValue([rutaAbierta]);

    const resultado = await useCase.finalizarRuta(1);

    expect(resultado.estado).toBe(EstadoHojaRuta.CERRADA);
    expect(mockHojaRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoHojaRuta.CERRADA);
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(100, EstadoRuta.FINALIZADA);
  });

  it('debe cancelar la ruta cerrando la hoja y cancelando las rutas asociadas', async () => {
    const hojaCerrada = new HojaRuta('2026-06-15', EstadoHojaRuta.CERRADA);
    hojaCerrada.id = 1;
    vi.mocked(mockHojaRutaRepo.cambiarEstado).mockResolvedValue(hojaCerrada);

    const rutaEnCurso = new Ruta(1, 10, '2026-06-15', EstadoRuta.EN_CURSO);
    rutaEnCurso.id = 101;
    vi.mocked(mockRutaRepo.obtenerPorHojaRuta).mockResolvedValue([rutaEnCurso]);

    const resultado = await useCase.cancelarRuta(1, 'Derrumbe en la vía');

    expect(resultado.estado).toBe(EstadoHojaRuta.CERRADA);
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(101, EstadoRuta.CANCELADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(101, {
      observacionChofer: 'Hoja cancelada: Derrumbe en la vía',
    });
  });

  it('debe obtener nombres de paradas intermedias ordenadas cuando no es directo', async () => {
    const frecuencia = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FREQ-01', false);
    frecuencia.id = 5;

    const paradas: ParadaIntermedia[] = [
      new ParadaIntermedia('Riobamba', 2, 180),
      new ParadaIntermedia('Ambato', 1, 90),
    ];

    vi.mocked(mockFrecuenciaRepo.obtenerParadas).mockResolvedValue(paradas);

    const nombres = await useCase.obtenerNombresParadas(frecuencia);

    expect(nombres).toEqual(['Ambato', 'Riobamba']);
  });

  it('debe retornar arreglo vacío para paradas si la frecuencia es directa', async () => {
    const frecuenciaDirecta = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FREQ-01', true);
    frecuenciaDirecta.id = 5;

    const nombres = await useCase.obtenerNombresParadas(frecuenciaDirecta);

    expect(nombres).toEqual([]);
    expect(mockFrecuenciaRepo.obtenerParadas).not.toHaveBeenCalled();
  });
});
