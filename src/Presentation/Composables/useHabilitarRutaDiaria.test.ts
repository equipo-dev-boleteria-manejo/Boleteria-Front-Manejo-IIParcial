import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHabilitarRutaDiaria } from './useHabilitarRutaDiaria';
import { HabilitarRutaDiaria } from '../../Application/UseCases/HabilitarRutaDiaria';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';

describe('useHabilitarRutaDiaria Composable', () => {
  let mockUseCase: HabilitarRutaDiaria;

  beforeEach(() => {
    mockUseCase = {
      ejecutar: vi.fn(),
      execute: vi.fn(),
    } as unknown as HabilitarRutaDiaria;
  });

  it('debe inicializar con estados por defecto limpios', () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.rutaCreada.value).toBeNull();
  });

  it('debe crear ruta exitosamente y actualizar el estado reactivo', async () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    const rutaMock = new Ruta(1, 10, '2026-05-25', EstadoRuta.PROGRAMADA);
    rutaMock.id = 100;

    vi.mocked(mockUseCase.ejecutar).mockResolvedValue(rutaMock);

    const input = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    const resultado = await composable.habilitar(input);

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.rutaCreada.value).toBeDefined();
    expect(composable.rutaCreada.value?.id).toBe(100);
    expect(resultado.id).toBe(100);
  });

  it('debe capturar error, actualizar estado y re-lanzar la excepción', async () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    const errorMsg = 'Frecuencia no se encuentra activa';
    vi.mocked(mockUseCase.ejecutar).mockRejectedValue(new DomainException(errorMsg));

    const input = {
      frecuenciaId: 999,
      busId: 10,
      fecha: '2026-05-25',
    };

    await expect(composable.habilitar(input)).rejects.toThrow(DomainException);

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBe(errorMsg);
    expect(composable.rutaCreada.value).toBeNull();
  });

  it('debe establecer loading en true durante la ejecución', async () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    let loadingEnEjecucion = false;

    vi.mocked(mockUseCase.ejecutar).mockImplementation(async () => {
      loadingEnEjecucion = composable.loading.value === true;
      const r = new Ruta(1, 10, '2026-05-25', EstadoRuta.PROGRAMADA);
      r.id = 100;
      return r;
    });

    const input = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    await composable.habilitar(input);

    expect(loadingEnEjecucion).toBe(true);
    expect(composable.loading.value).toBe(false);
  });

  it('debe limpiar estados al invocar limpiar()', async () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    const rutaMock = new Ruta(1, 10, '2026-05-25', EstadoRuta.PROGRAMADA);
    rutaMock.id = 100;
    vi.mocked(mockUseCase.ejecutar).mockResolvedValue(rutaMock);

    await composable.habilitar({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    });

    expect(composable.rutaCreada.value).not.toBeNull();

    composable.limpiar();

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.rutaCreada.value).toBeNull();
  });

  it('debe exportar todos los métodos y refs requeridos', () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    expect(typeof composable.habilitar).toBe('function');
    expect(typeof composable.limpiar).toBe('function');
    expect(composable.loading).toBeDefined();
    expect(composable.error).toBeDefined();
    expect(composable.rutaCreada).toBeDefined();
  });

  it('debe preservar el mensaje exacto del error', async () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    const mensajeError = 'El bus no está disponible en esa fecha';
    vi.mocked(mockUseCase.ejecutar).mockRejectedValue(new DomainException(mensajeError));

    try {
      await composable.habilitar({
        frecuenciaId: 1,
        busId: 10,
        fecha: '2026-05-25',
      });
    } catch {
      // Ignoramos la excepción aquí para validar el estado reactivo
    }

    expect(composable.error.value).toBe(mensajeError);
  });

  it('debe manejar errores no esperados convirtiéndolos en mensaje legible', async () => {
    const composable = useHabilitarRutaDiaria(mockUseCase);

    vi.mocked(mockUseCase.ejecutar).mockRejectedValue(new Error('Fallo de red'));

    try {
      await composable.habilitar({
        frecuenciaId: 1,
        busId: 10,
        fecha: '2026-05-25',
      });
    } catch {
      // expected
    }

    expect(composable.error.value).toBe('Fallo de red');
    expect(composable.loading.value).toBe(false);
  });
});
