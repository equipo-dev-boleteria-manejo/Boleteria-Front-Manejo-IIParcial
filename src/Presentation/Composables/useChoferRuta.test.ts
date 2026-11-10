import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChoferRuta } from './useChoferRuta';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IAbordajeBoletosRepository } from '../../Domain/Repositories/IAbordajeBoletosRepository';
import { Boleto } from '../../Domain/Entities/Boleto';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBoleto, EstadoRuta } from '../../Domain/Constants/EstadosSistema';

describe('useChoferRuta Composable', () => {
  let mockRutaRepo: IRutaRepository;
  let mockBoletosRepo: IAbordajeBoletosRepository;

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
      obtenerPorCodigo: vi.fn(),
      marcarAbordado: vi.fn(),
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
    const boleto = new Boleto(5, 1, 12, '0926687856', 'Ana', 'Pérez', 10, undefined, EstadoBoleto.EMITIDO);
    boleto.id = 50;
    boleto.codigoQr = 'QR-VALIDO-123';
    vi.mocked(mockBoletosRepo.obtenerPorCodigo).mockResolvedValue(boleto);

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

  it('registra en el historial el rechazo de un boleto de otra ruta', async () => {
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rEnCurso]);
    const ajeno = new Boleto(5, 2, 12, '0926687856', 'Ana', 'Pérez', 10, undefined, EstadoBoleto.EMITIDO);
    ajeno.id = 51;
    vi.mocked(mockBoletosRepo.obtenerPorCodigo).mockResolvedValue(ajeno);

    const composable = useChoferRuta(mockRutaRepo, mockBoletosRepo);
    await composable.cargarRutaChofer('chofer-1', '2026-06-01');

    const res = await composable.validarQrBoleto('QR-OTRA-RUTA');

    expect(res.ok).toBe(false);
    expect(res.mensaje).toBe('El boleto no corresponde a esta ruta.');
    expect(mockBoletosRepo.marcarAbordado).not.toHaveBeenCalled();
  });

  it('debe limpiar estado con limpiar()', () => {
    const composable = useChoferRuta(mockRutaRepo);
    composable.rutaActual.value = new Ruta(1, 10, '2026-06-01');
    composable.error.value = 'error previo';

    composable.limpiar();

    expect(composable.rutaActual.value).toBeNull();
    expect(composable.error.value).toBeNull();
  });

  it('sin fecha consulta las rutas del día local, también a última hora de la noche', async () => {
    vi.useFakeTimers();
    // 23:30 hora local del 10/11: en UTC-5 ya sería el 11/11 en UTC.
    vi.setSystemTime(new Date(2026, 10, 10, 23, 30));
    try {
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([]);
      const composable = useChoferRuta(mockRutaRepo);

      await composable.cargarRutaChofer('chofer-1');

      expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-11-10');
    } finally {
      vi.useRealTimers();
    }
  });

  it('si se indica una fecha, usa esa y no la de hoy', async () => {
    vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([]);
    const composable = useChoferRuta(mockRutaRepo);

    await composable.cargarRutaChofer('chofer-1', '2026-12-01');

    expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-12-01');
  });
});
