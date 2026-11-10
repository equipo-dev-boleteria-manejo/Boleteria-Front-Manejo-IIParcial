import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSeatTypes } from './useSeatTypes';
import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';

describe('useSeatTypes Composable - Pruebas de Reactividad', () => {
  let mockRepository: ISeatTypeRepository;

  const mockSeatType: any = {
    id: 1,
    nombre: 'VIP',
    colorHex: '#00FF00',
    precioBase: 25.0,
    descripcion: 'Asiento VIP',
    estado: true,
    estaActivo: () => true,
  };

  beforeEach(() => {
    mockRepository = {
      obtenerTodos: vi.fn().mockResolvedValue([mockSeatType]),
      obtenerActivos: vi.fn().mockResolvedValue([mockSeatType]),
      obtenerPorId: vi.fn().mockResolvedValue(mockSeatType),
      crear: vi.fn().mockResolvedValue(mockSeatType),
      actualizar: vi.fn().mockResolvedValue(mockSeatType),
      eliminar: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISeatTypeRepository;
  });

  it('debe inicializarse con estados por defecto', () => {
    const { seatTypes, loading, error, tieneTiposAsiento } = useSeatTypes(mockRepository);

    expect(seatTypes.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(tieneTiposAsiento.value).toBe(false);
  });

  it('debe cargar tipos de asiento y actualizar la reactividad correctamente', async () => {
    const { seatTypes, loading, error, tieneTiposAsiento, cargarTiposAsiento } = useSeatTypes(mockRepository);

    const promise = cargarTiposAsiento();
    expect(loading.value).toBe(true);

    await promise;

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(seatTypes.value).toHaveLength(1);
    expect(seatTypes.value[0].nombre).toBe('VIP');
    expect(tieneTiposAsiento.value).toBe(true);
  });

  it('debe capturar errores si la llamada al repositorio falla', async () => {
    mockRepository.obtenerActivos = vi.fn().mockRejectedValue(new Error('Error de conexión'));
    const { seatTypes, loading, error, cargarTiposAsiento } = useSeatTypes(mockRepository);

    await cargarTiposAsiento();

    expect(loading.value).toBe(false);
    expect(seatTypes.value).toEqual([]);
    expect(error.value).toBe('Error de conexión');
  });

  it('debe validar asignación devolviendo boolean', () => {
    const { validarAsignacion, error } = useSeatTypes(mockRepository);

    const esValido = validarAsignacion({
      rutaTipoDirecta: true,
      paradaDestinoId: 5,
      terminalDestinoId: 5,
    });

    expect(esValido).toBe(true);
    expect(error.value).toBeNull();
  });
});