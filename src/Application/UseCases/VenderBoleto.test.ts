import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VenderBoleto, VenderBoletoInput } from './VenderBoleto';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { EstadoVenta } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';

describe('VenderBoleto (Caso de Uso)', () => {
  let mockVentaRepo: IVentaRepository;
  let mockBoletosRepo: IBoletosRepository;
  let useCase: VenderBoleto;

  beforeEach(() => {
    mockVentaRepo = {
      crearVenta: vi.fn().mockResolvedValue(999),
      cancelarVenta: vi.fn(),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn(),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn(),
      rechazarVenta: vi.fn(),
      migrarVentasARuta: vi.fn(),
    };

    mockBoletosRepo = {
      insertarBoletos: vi.fn().mockResolvedValue([{ id: 101 }]),
      actualizarEstadoPorVenta: vi.fn(),
      obtenerBoletosPorVenta: vi.fn(),
      obtenerBoletosPorRuta: vi.fn(),
      obtenerBoletosPorUsuario: vi.fn(),
      verificarAsientoDisponible: vi.fn().mockResolvedValue(true),
      obtenerAsientosDisponiblesPorRuta: vi.fn(),
      obtenerAsientosOcupadosPorRuta: vi.fn(),
      obtenerBoletoPorId: vi.fn(),
    };

    useCase = new VenderBoleto(mockVentaRepo, mockBoletosRepo);
  });

  it('debe registrar exitosamente la venta física en ventanilla en estado AprobadaPago', async () => {
    const input: VenderBoletoInput = {
      usuarioVendedorId: 'oficinista-001',
      ruta: {
        id: 1,
        estado: 'Programada',
        origen: 'Quito',
        destinoFinal: 'Guayaquil',
        esDirecto: true,
      },
      ciudadDestinoVenta: 'Guayaquil',
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          asientoId: 12,
          nombres: 'María',
          apellidos: 'López',
          cedula: '1710000009',
          fechaNacimiento: '1998-04-12',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0,
          precioFinal: 15.0,
        },
      ],
    };

    const resultado = await useCase.ejecutar(input);

    expect(mockBoletosRepo.verificarAsientoDisponible).toHaveBeenCalledWith(1, 12);
    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({
        UsuarioVendedorId: 'oficinista-001',
        RutaId: 1,
        Total: 15.0,
        Estado: EstadoVenta.APROBADA_PAGO,
        MetodoPago: 'Efectivo',
      })
    );
    expect(mockBoletosRepo.insertarBoletos).toHaveBeenCalled();
    expect(resultado.ventaId).toBe(999);
    expect(resultado.total).toBe(15.0);
  });

  it('debe lanzar DomainException si no hay usuario oficinista autenticado', async () => {
    const input: any = {
      usuarioVendedorId: '',
      ruta: { id: 1 },
      pasajeros: [{ asientoId: 1 }],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('No se encontró el usuario oficinista');
  });

  it('debe impedir venta si la ruta está cancelada o completada', async () => {
    const input: VenderBoletoInput = {
      usuarioVendedorId: 'oficinista-001',
      ruta: {
        id: 1,
        estado: 'Cancelada',
        origen: 'Quito',
        destinoFinal: 'Guayaquil',
        esDirecto: true,
      },
      ciudadDestinoVenta: 'Guayaquil',
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          asientoId: 12,
          nombres: 'María',
          apellidos: 'López',
          cedula: '1710000009',
          fechaNacimiento: '1998-04-12',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0,
          precioFinal: 15.0,
        },
      ],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('No se puede vender en una ruta cancelada o completada');
  });

  it('debe rechazar venta con parada intermedia en frecuencia directa', async () => {
    const input: VenderBoletoInput = {
      usuarioVendedorId: 'oficinista-001',
      ruta: {
        id: 1,
        estado: 'Programada',
        origen: 'Quito',
        destinoFinal: 'Guayaquil',
        esDirecto: true,
      },
      ciudadDestinoVenta: 'Riobamba',
      paradaDestinoId: 5,
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          asientoId: 12,
          nombres: 'María',
          apellidos: 'López',
          cedula: '1710000009',
          fechaNacimiento: '1998-04-12',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0,
          precioFinal: 10.0,
        },
      ],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('No se permiten paradas intermedias en una frecuencia directa');
  });

  it('debe rechazar si la parada intermedia no permite venta', async () => {
    const input: VenderBoletoInput = {
      usuarioVendedorId: 'oficinista-001',
      ruta: {
        id: 1,
        estado: 'Programada',
        origen: 'Quito',
        destinoFinal: 'Guayaquil',
        esDirecto: false,
      },
      ciudadDestinoVenta: 'Riobamba',
      paradaDestinoId: 5,
      paradaPermiteVenta: false,
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          asientoId: 12,
          nombres: 'María',
          apellidos: 'López',
          cedula: '1710000009',
          fechaNacimiento: '1998-04-12',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0,
          precioFinal: 10.0,
        },
      ],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('La parada seleccionada no permite venta de boletos');
  });

  it('debe lanzar error si el asiento ya se encuentra ocupado', async () => {
    vi.mocked(mockBoletosRepo.verificarAsientoDisponible).mockResolvedValueOnce(false);

    const input: VenderBoletoInput = {
      usuarioVendedorId: 'oficinista-001',
      ruta: {
        id: 1,
        estado: 'Programada',
        origen: 'Quito',
        destinoFinal: 'Guayaquil',
        esDirecto: true,
      },
      ciudadDestinoVenta: 'Guayaquil',
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          asientoId: 12,
          nombres: 'María',
          apellidos: 'López',
          cedula: '1710000009',
          fechaNacimiento: '1998-04-12',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0,
          precioFinal: 15.0,
        },
      ],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('El asiento 12 ya fue vendido');
  });
});
