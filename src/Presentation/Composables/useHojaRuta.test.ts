import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHojaRuta } from './useHojaRuta';
import { GestionarHojaRuta } from '../../Application/UseCases/GestionarHojaRuta';
import { AsignarRutaAHoja } from '../../Application/UseCases/AsignarRutaAHoja';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoHojaRuta } from '../../Domain/Constants/EstadosSistema';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';

describe('useHojaRuta Composable', () => {
  let mockGestionar: GestionarHojaRuta;
  let mockAsignar: AsignarRutaAHoja;
  let mockRutaRepo: IRutaRepository;

  beforeEach(() => {
    mockGestionar = {
      listarPorFecha: vi.fn().mockResolvedValue([]),
      crearHojaDia: vi.fn(),
      iniciarRuta: vi.fn(),
      finalizarRuta: vi.fn(),
      cancelarRuta: vi.fn(),
      obtenerNombresParadas: vi.fn(),
    } as unknown as GestionarHojaRuta;

    mockAsignar = {
      ejecutar: vi.fn(),
      execute: vi.fn(),
    } as unknown as AsignarRutaAHoja;

    mockRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn(),
      obtenerPorChoferYFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn().mockResolvedValue({} as Ruta),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };
  });

  it('debe inicializar con estado limpio', () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.hojasRuta.value).toEqual([]);
    expect(composable.hojaActual.value).toBeNull();
  });

  it('debe cargar hojas de ruta por fecha y actualizar referencias reactivas', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    const hoja = new HojaRuta('2026-06-15', EstadoHojaRuta.BORRADOR);
    hoja.id = 1;
    vi.mocked(mockGestionar.listarPorFecha).mockResolvedValue([hoja]);

    const resultado = await composable.cargarPorFecha('2026-06-15');

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.hojasRuta.value).toHaveLength(1);
    expect(composable.hojaActual.value?.id).toBe(1);
    expect(resultado).toHaveLength(1);
  });

  it('debe crear la hoja de ruta del día y recargar la fecha', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    const hojaNueva = new HojaRuta('2026-06-15', EstadoHojaRuta.BORRADOR);
    hojaNueva.id = 2;
    vi.mocked(mockGestionar.crearHojaDia).mockResolvedValue(hojaNueva);
    vi.mocked(mockGestionar.listarPorFecha).mockResolvedValue([hojaNueva]);

    const res = await composable.crearHojaDia('2026-06-15', 'admin-1');

    expect(mockGestionar.crearHojaDia).toHaveBeenCalledWith('2026-06-15', 'admin-1');
    expect(composable.hojaActual.value?.id).toBe(2);
    expect(res.id).toBe(2);
  });

  it('debe agregar trayecto con éxito y recargar la lista de la fecha', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    vi.mocked(mockAsignar.ejecutar).mockResolvedValue({
      success: true,
    });
    vi.mocked(mockGestionar.listarPorFecha).mockResolvedValue([]);

    const ok = await composable.agregarTrayecto(10, 1, '2026-06-15', 'admin-1');

    expect(ok).toBe(true);
    expect(mockAsignar.ejecutar).toHaveBeenCalledWith({
      busId: 10,
      frecuenciaId: 1,
      fecha: '2026-06-15',
      usuarioCreadorId: 'admin-1',
    });
    expect(mockGestionar.listarPorFecha).toHaveBeenCalledWith('2026-06-15');
  });

  it('debe manejar error al fallar agregarTrayecto', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    vi.mocked(mockAsignar.ejecutar).mockResolvedValue({
      success: false,
      error: 'El bus 10 ya tiene un trayecto que se solapa con este horario.',
    });

    const ok = await composable.agregarTrayecto(10, 1, '2026-06-15');

    expect(ok).toBe(false);
    expect(composable.error.value).toContain('solapa');
  });

  it('debe iniciar hoja de ruta', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    const hojaEmitida = new HojaRuta('2026-06-15', EstadoHojaRuta.EMITIDA);
    vi.mocked(mockGestionar.iniciarRuta).mockResolvedValue(hojaEmitida);

    await composable.iniciarHoja(1, '2026-06-15');

    expect(mockGestionar.iniciarRuta).toHaveBeenCalledWith(1);
    expect(mockGestionar.listarPorFecha).toHaveBeenCalledWith('2026-06-15');
  });

  it('debe finalizar hoja de ruta', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    const hojaCerrada = new HojaRuta('2026-06-15', EstadoHojaRuta.CERRADA);
    vi.mocked(mockGestionar.finalizarRuta).mockResolvedValue(hojaCerrada);

    await composable.finalizarHoja(1, '2026-06-15');

    expect(mockGestionar.finalizarRuta).toHaveBeenCalledWith(1);
    expect(mockGestionar.listarPorFecha).toHaveBeenCalledWith('2026-06-15');
  });

  it('debe alternar modalidad directa de ruta con toggleTipoRuta', async () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);
    const ruta = new Ruta(1, 10, '2026-06-15');
    ruta.id = 5;
    ruta.esDirecta = true;

    const ok = await composable.toggleTipoRuta(ruta, '2026-06-15');

    expect(ok).toBe(true);
    expect(ruta.esDirecta).toBe(false);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(5, { esDirecta: false });
    expect(mockGestionar.listarPorFecha).toHaveBeenCalledWith('2026-06-15');
  });

  it('debe limpiar estados con limpiar()', () => {
    const composable = useHojaRuta(mockGestionar, mockAsignar, mockRutaRepo);

    composable.hojasRuta.value = [new HojaRuta('2026-06-15')];
    composable.hojaActual.value = new HojaRuta('2026-06-15');
    composable.error.value = 'error previo';

    composable.limpiar();

    expect(composable.hojasRuta.value).toEqual([]);
    expect(composable.hojaActual.value).toBeNull();
    expect(composable.error.value).toBeNull();
  });
});
