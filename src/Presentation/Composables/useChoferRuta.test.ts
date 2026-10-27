import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChoferRuta } from './useChoferRuta';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';

describe('useChoferRuta Composable', () => {
  let mockRutaRepo: IRutaRepository;
  let mockBoletosRepo: IBoletosRepository;

  beforeEach(() => {
    mockRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn(),
      obtenerPorChoferYFecha: vi.fn().mockResolvedValue([]),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };

    mockBoletosRepo = {
      obtenerPorId: vi.fn(),
      obtenerPorCodigo: vi.fn(),
      obtenerPorVentaId: vi.fn(),
      obtenerPorRutaId: vi.fn(),
      crear: vi.fn(),
      actualizarEstado: vi.fn(),
      marcarAbordado: vi.fn(),
      marcarNoAbordo: vi.fn(),
      obtenerBoletosOcupados: vi.fn(),
    };
  });

  it('debe inicializar con estado por defecto', () => {
    const composable = useChoferRuta(mockRutaRepo);

    expect(composable.rutaActual.value).toBeNull();
    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.historial.value).toEqual([]);
    expect(composable.rutaProgramada.value).toBe(false);
  });

  it('debe cargar la ruta asignada al chofer y priorizar en curso', async () => {
    const rProgramada = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    rProgramada.id = 1;
    const rEnCurso = new Ruta(2, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 2;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rProgramada, rEnCurso]);

    const composable = useChoferRuta(mockRutaRepo);
    const activa = await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    expect(activa?.id).toBe(2);
    expect(composable.rutaActual.value?.id).toBe(2);
    expect(composable.rutaEnCurso.value).toBe(true);
    expect(composable.rutaProgramada.value).toBe(false);
  });

  it('debe iniciar viaje cuando la ruta está Programada', async () => {
    const rProgramada = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    rProgramada.id = 1;

    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rProgramada]);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rEnCurso);

    const composable = useChoferRuta(mockRutaRepo);
    await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    const res = await composable.iniciarViaje();

    expect(res.ok).toBe(true);
    expect(composable.rutaActual.value?.estado).toBe(EstadoRuta.EN_CURSO);
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.EN_CURSO);
  });

  it('debe finalizar viaje cuando la ruta está En Curso', async () => {
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    const rFinalizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.FINALIZADA);
    rFinalizada.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rEnCurso]);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rFinalizada);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rFinalizada);

    const composable = useChoferRuta(mockRutaRepo);
    await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    const res = await composable.finalizarViaje('Llegada a tiempo');

    expect(res.ok).toBe(true);
    expect(composable.rutaActual.value?.estado).toBe(EstadoRuta.FINALIZADA);
    expect(composable.rutaCompletada.value).toBe(true);
  });

  it('debe registrar emergencia en la ruta', async () => {
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rEnCurso]);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rEnCurso);

    const composable = useChoferRuta(mockRutaRepo);
    await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    const res = await composable.marcarEmergencia('Neumático pinchado');

    expect(res.ok).toBe(true);
    expect(mockRutaRepo.actualizar).toHaveBeenCalled();
  });

  it('debe validar QR de boleto y registrar en el historial', async () => {
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rEnCurso]);
    vi.mocked(mockBoletosRepo.obtenerPorCodigo).mockResolvedValue({
      id: 50,
      codigoQr: 'QR-VALIDO-123',
    } as any);

    const composable = useChoferRuta(mockRutaRepo, mockBoletosRepo);
    await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    const res = await composable.validarQrBoleto('QR-VALIDO-123');

    expect(res.ok).toBe(true);
    expect(composable.historial.value).toHaveLength(1);
    expect(composable.historial.value[0]?.resultado).toBe('Validado');
    expect(mockBoletosRepo.marcarAbordado).toHaveBeenCalledWith(50);
  });

  it('debe registrar error en historial si el boleto es inválido', async () => {
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rEnCurso]);
    vi.mocked(mockBoletosRepo.obtenerPorCodigo).mockResolvedValue(null);

    const composable = useChoferRuta(mockRutaRepo, mockBoletosRepo);
    await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    const res = await composable.validarQrBoleto('QR-INEXISTENTE');

    expect(res.ok).toBe(false);
    expect(composable.historial.value).toHaveLength(1);
    expect(composable.historial.value[0]?.resultado).toContain('no encontrado');
  });

  it('debe limpiar estado con limpiar()', () => {
    const composable = useChoferRuta(mockRutaRepo);
    composable.rutaActual.value = new Ruta(1, 10, '2026-06-01');
    composable.error.value = 'error previo';

    composable.limpiar();

    expect(composable.rutaActual.value).toBeNull();
    expect(composable.error.value).toBeNull();
  });
});
