import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeatTypeUseCases } from './SeatTypeUseCases';
import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { 
  PrecioNegativoException, 
  PorcentajeDescuentoInvalidoException, 
  SeatTypeNoEncontradoException 
} from '../../Domain/Exceptions/SeatTypeException';

describe('SeatTypeUseCases - Pruebas Unitarias', () => {
  let mockRepository: ISeatTypeRepository;
  let useCases: SeatTypeUseCases;

  // Objeto de prueba con la estructura esperada por el mapper de la entidad
  const mockSeatType: any = {
    id: 1,
    nombre: 'Ejecutivo',
    colorHex: '#FF0000',
    precioBase: 10.0,
    descripcion: 'Asiento cómodo',
    estado: true,
    estaActivo: () => true,
  };

  beforeEach(() => {
    mockRepository = {
      obtenerTodos: vi.fn().mockResolvedValue([mockSeatType]),
      obtenerActivos: vi.fn().mockResolvedValue([mockSeatType]),
      obtenerPorId: vi.fn().mockImplementation(async (id: any) => {
        if (id === 1 || id === '1') return mockSeatType;
        return null;
      }),
      crear: vi.fn().mockResolvedValue(mockSeatType),
      actualizar: vi.fn().mockResolvedValue(mockSeatType),
      eliminar: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISeatTypeRepository;

    useCases = new SeatTypeUseCases(mockRepository);
  });

  it('debe obtener los tipos de asiento activos mapeados a DTO', async () => {
    const resultado = await useCases.obtenerTiposAsiento();
    expect(mockRepository.obtenerActivos).toHaveBeenCalled();
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe('Ejecutivo');
  });

  it('debe calcular la tarifa conectándose al catálogo mediante seatTypeId', async () => {
    const precioFinal = await useCases.calcularTarifaAsiento({
      seatTypeId: 1,
      porcentajeDescuento: 20,
    });
    expect(mockRepository.obtenerPorId).toHaveBeenCalled();
    expect(precioFinal).toBe(8);
  });

  it('debe calcular la tarifa usando precioBase directo si no se envía seatTypeId', async () => {
    const precioFinal = await useCases.calcularTarifaAsiento({
      precioBase: 100,
      porcentajeDescuento: 15,
    });
    expect(precioFinal).toBe(85);
  });

  it('debe lanzar SeatTypeNoEncontradoException si el id del catálogo no existe', async () => {
    await expect(
      useCases.calcularTarifaAsiento({ seatTypeId: 999 })
    ).rejects.toThrow(SeatTypeNoEncontradoException);
  });

  it('debe lanzar PrecioNegativoException si el precio base es negativo', async () => {
    await expect(
      useCases.calcularTarifaAsiento({ precioBase: -50 })
    ).rejects.toThrow(PrecioNegativoException);
  });

  it('debe lanzar PorcentajeDescuentoInvalidoException si el descuento es mayor a 100', async () => {
    await expect(
      useCases.calcularTarifaAsiento({ precioBase: 10, porcentajeDescuento: 150 })
    ).rejects.toThrow(PorcentajeDescuentoInvalidoException);
  });

  it('debe lanzar PorcentajeDescuentoInvalidoException si el descuento es negativo', async () => {
    await expect(
      useCases.calcularTarifaAsiento({ precioBase: 10, porcentajeDescuento: -5 })
    ).rejects.toThrow(PorcentajeDescuentoInvalidoException);
  });

  it('debe validar asignación cuando la parada coincide con la terminal en ruta directa', () => {
    expect(() =>
      useCases.validarAsignacionAsiento({
        rutaTipoDirecta: true,
        paradaDestinoId: 5,
        terminalDestinoId: 5,
      })
    ).not.toThrow();
  });

  it('debe fallar asignación cuando una ruta directa intenta desembarcar en parada intermedia', () => {
    expect(() =>
      useCases.validarAsignacionAsiento({
        rutaTipoDirecta: true,
        paradaDestinoId: 2,
        terminalDestinoId: 5,
      })
    ).toThrow();
  });
});