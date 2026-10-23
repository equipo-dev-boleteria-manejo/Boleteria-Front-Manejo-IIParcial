import { describe, it, expect, vi } from 'vitest';
import { SeatTypeUseCases } from './SeatTypeUseCases';
import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';

// Inyección de casting para evitar incompatibilidades de firmas de tipos con vi.fn()
const mockRepository = {
  obtenerTodos: vi.fn().mockResolvedValue([]),
  obtenerActivos: vi.fn().mockResolvedValue([
    {
      id: 1,
      nombre: 'Ejecutivo',
      colorHex: '#FF0000',
      precioBase: 10.0,
      descripcion: 'Asiento cómodo',
      estado: true,
    },
  ]),
  obtenerPorId: vi.fn().mockResolvedValue(null),
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
} as unknown as ISeatTypeRepository;

describe('SeatTypeUseCases - Pruebas Unitarias', () => {
  const useCases = new SeatTypeUseCases(mockRepository);

  it('debe obtener los tipos de asiento activos mapeados a DTO', async () => {
    const resultado = await useCases.obtenerTiposAsiento();
    expect(mockRepository.obtenerActivos).toHaveBeenCalled();
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe('Ejecutivo');
  });

  it('debe calcular la tarifa aplicando el porcentaje de descuento correctamente', () => {
    const precioFinal = useCases.calcularTarifaAsiento({
      precioBase: 100,
      porcentajeDescuento: 20,
    });
    expect(precioFinal).toBe(80);
  });

  it('debe lanzar error si el precio base es negativo al calcular la tarifa', () => {
    expect(() =>
      useCases.calcularTarifaAsiento({
        precioBase: -50,
        porcentajeDescuento: 10,
      })
    ).toThrow('El precio base no puede ser negativo');
  });

  it('debe validar la asignación de asiento si el destino coincide con la terminal en ruta directa', () => {
    expect(() =>
      useCases.validarAsignacionAsiento({
        rutaTipoDirecta: true,
        paradaDestinoId: 5,
        terminalDestinoId: 5,
      })
    ).not.toThrow();
  });
});