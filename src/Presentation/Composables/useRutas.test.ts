import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useRutas } from './useRutas';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { Bus } from '../../Domain/Entities/Bus';
import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { EstadoBus, EstadoRuta } from '../../Domain/Constants/EstadosSistema';

describe('useRutas Composable', () => {
  let mockRutaRepo: IRutaRepository;
  let mockBusRepo: IBusRepository;
  let mockFrecuenciaRepo: IFrecuenciaRepository;

  beforeEach(() => {
    mockRutaRepo = {
      obtenerTodas: vi.fn().mockResolvedValue([]),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn(),
      obtenerPorChoferYFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };

    mockBusRepo = {
      obtenerTodos: vi.fn().mockResolvedValue([]),
      obtenerPorCooperativa: vi.fn().mockResolvedValue([]),
      obtenerDisponiblesParaOperar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorPlaca: vi.fn(),
      obtenerPorNumero: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminarLogico: vi.fn(),
    };

    mockFrecuenciaRepo = {
      obtenerTodas: vi.fn().mockResolvedValue([]),
      obtenerPorId: vi.fn(),
      obtenerPorCooperativa: vi.fn().mockResolvedValue([]),
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
  });

  it('debe inicializar con listas vacías y loading en false', () => {
    const { rutas, buses, frecuencias, loading, error } = useRutas(
      mockRutaRepo,
      mockBusRepo,
      mockFrecuenciaRepo
    );

    expect(rutas.value).toEqual([]);
    expect(buses.value).toEqual([]);
    expect(frecuencias.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('debe cargar rutas y permitir filtrar reactivamente por estado y fecha', async () => {
    const r1 = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r1.id = 1;
    const r2 = new Ruta(2, 20, '2026-06-02', EstadoRuta.EN_CURSO);
    r2.id = 2;

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([r1, r2]);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    expect(composable.rutas.value).toHaveLength(2);
    expect(composable.rutasFiltradas.value).toHaveLength(2);

    // Filtrar por estado
    composable.filtroEstado.value = EstadoRuta.PROGRAMADA;
    expect(composable.rutasFiltradas.value).toHaveLength(1);
    expect(composable.rutasFiltradas.value[0]?.id).toBe(1);

    // Filtrar por fecha que no coincide
    composable.filtroFecha.value = '2026-06-02';
    expect(composable.rutasFiltradas.value).toHaveLength(0);

    // Restablecer filtro de estado
    composable.filtroEstado.value = 'Todas';
    expect(composable.rutasFiltradas.value).toHaveLength(1);
    expect(composable.rutasFiltradas.value[0]?.id).toBe(2);
  });

  it('debe cargar buses del catálogo', async () => {
    const bus = new Bus(1, '001', 'ABC-1234', 40, EstadoBus.ACTIVO);
    vi.mocked(mockBusRepo.obtenerTodos).mockResolvedValue([bus]);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    const resultado = await composable.cargarBuses();

    expect(resultado).toHaveLength(1);
    expect(composable.buses.value).toHaveLength(1);
  });

  it('debe cargar frecuencias', async () => {
    const freq = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FREQ-01');
    vi.mocked(mockFrecuenciaRepo.obtenerTodas).mockResolvedValue([freq]);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    const resultado = await composable.cargarFrecuencias();

    expect(resultado).toHaveLength(1);
    expect(composable.frecuencias.value).toHaveLength(1);
  });

  it('prepara filas de presentación con filtros de texto y etiquetas', async () => {
    const ruta = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    ruta.id = 1;
    const bus = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
    bus.id = 10;
    const frecuencia = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FREQ-01');
    frecuencia.id = 1;

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([ruta]);
    vi.mocked(mockBusRepo.obtenerTodos).mockResolvedValue([bus]);
    vi.mocked(mockFrecuenciaRepo.obtenerTodas).mockResolvedValue([frecuencia]);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await Promise.all([
      composable.cargarRutas(),
      composable.cargarBuses(),
      composable.cargarFrecuencias(),
    ]);

    expect(composable.rutasPaginadas.value[0]).toMatchObject({
      ruta,
      trayectoEtiqueta: 'Quito → Guayaquil',
      busEtiqueta: 'Bus #25 (PBA-1234)',
    });

    composable.filtroTexto.value = 'guayaquil';
    expect(composable.rutasFiltradas.value).toHaveLength(1);
    composable.filtroTexto.value = 'placa-no-existe';
    expect(composable.rutasPaginadas.value).toHaveLength(0);
  });

  it('pagina los resultados y reinicia la página cuando cambian los filtros', async () => {
    const rutas = Array.from({ length: 9 }, (_, index) => {
      const ruta = new Ruta(1, index + 1, '2026-06-01', EstadoRuta.PROGRAMADA);
      ruta.id = index + 1;
      return ruta;
    });
    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue(rutas);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    expect(composable.totalPaginas.value).toBe(2);
    composable.paginaActual.value = 2;
    expect(composable.rutasPaginadas.value).toHaveLength(1);

    composable.filtroTexto.value = 'no existe';
    await nextTick();

    expect(composable.paginaActual.value).toBe(1);
    expect(composable.rutasPaginadas.value).toHaveLength(0);
  });

  it('debe cambiar estado de una ruta e iniciar viaje', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;

    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([r]);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rEnCurso);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    const actualizada = await composable.iniciarViaje(1);

    expect(actualizada.estado).toBe(EstadoRuta.EN_CURSO);
    expect(composable.rutas.value[0]?.estado).toBe(EstadoRuta.EN_CURSO);
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.EN_CURSO);
  });

  it('debe finalizar viaje y actualizar la lista', async () => {
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    const rFinalizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.FINALIZADA);
    rFinalizada.id = 1;

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([rEnCurso]);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rFinalizada);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    const actualizada = await composable.finalizarViaje(1);

    expect(actualizada.estado).toBe(EstadoRuta.FINALIZADA);
  });

  it('debe cancelar viaje con motivo', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;

    const rCancelada = new Ruta(1, 10, '2026-06-01', EstadoRuta.CANCELADA);
    rCancelada.id = 1;

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([r]);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rCancelada);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rCancelada);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    const res = await composable.cancelarViaje(1, 'Falla mecánica');

    expect(res.estado).toBe(EstadoRuta.CANCELADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, {
      observacionChofer: 'Cancelado: Falla mecánica',
    });
  });

  it('debe asignar chofer a la ruta', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;

    const rConChofer = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    rConChofer.id = 1;
    rConChofer.choferId = 'chofer-uuid-7';

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([r]);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rConChofer);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    const res = await composable.asignarChofer(1, 'chofer-uuid-7');

    expect(res.choferId).toBe('chofer-uuid-7');
    expect(composable.rutas.value[0]?.choferId).toBe('chofer-uuid-7');
  });

  it('debe eliminar ruta de la lista reactiva', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;

    vi.mocked(mockRutaRepo.obtenerTodas).mockResolvedValue([r]);
    vi.mocked(mockRutaRepo.eliminar).mockResolvedValue(undefined);

    const composable = useRutas(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
    await composable.cargarRutas();

    await composable.eliminarRuta(1);

    expect(mockRutaRepo.eliminar).toHaveBeenCalledWith(1);
    expect(composable.rutas.value).toHaveLength(0);
  });
});
