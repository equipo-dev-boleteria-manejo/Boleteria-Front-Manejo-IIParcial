import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmarCompra, ConfirmInput } from './ConfirmarCompra';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import { EstadoVenta } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';

describe('ConfirmarCompra (Caso de Uso)', () => {
  let mockVentaRepo: IVentaRepository;
  let mockBoletosRepo: IBoletosRepository;
  let mockCalcularDescuento: CalcularDescuentoVenta;
  let useCase: ConfirmarCompra;

  beforeEach(() => {
    mockVentaRepo = {
      crearVenta: vi.fn().mockResolvedValue(123),
      cancelarVenta: vi.fn().mockResolvedValue(undefined),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn(),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn(),
      rechazarVenta: vi.fn(),
      migrarVentasARuta: vi.fn(),
      uploadComprobante: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.example.com/comprobante.png' }),
    };

    mockBoletosRepo = {
      insertarBoletos: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      actualizarEstadoPorVenta: vi.fn(),
      obtenerBoletosPorVenta: vi.fn(),
      obtenerBoletosPorRuta: vi.fn(),
      obtenerBoletosPorUsuario: vi.fn(),
      verificarAsientoDisponible: vi.fn().mockResolvedValue(true),
      obtenerAsientosDisponiblesPorRuta: vi.fn(),
      obtenerAsientosOcupadosPorRuta: vi.fn(),
      obtenerBoletoPorId: vi.fn(),
    };

    mockCalcularDescuento = {
      ejecutar: vi.fn().mockReturnValue({
        numeroCedula: '1803456789',
        edad: 30,
        tieneDiscapacidad: false,
        precioBase: 10,
        categoria: 'SIN_DESCUENTO',
        porcentajeDescuento: 0,
        montoDescuento: 0,
        precioFinal: 10,
      }),
    } as unknown as CalcularDescuentoVenta;

    useCase = new ConfirmarCompra(mockVentaRepo, mockBoletosRepo, undefined, mockCalcularDescuento);
  });

  it('debe registrar una venta y boletos correctamente con método Transferencia', async () => {
    const fakeFile = new File(['fake content'], 'recibo.png', { type: 'image/png' });

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5, 6],
      precioUnitario: 10,
      capturaArchivo: fakeFile,
      metodoPago: 'Transferencia',
      nombres: 'Carlos',
      apellidos: 'Andrade',
      cedula: '1803456789',
      fechaNacimiento: '1995-05-15',
      usuarioId: 'usr-456',
    };

    const resultado = await useCase.ejecutar(input);

    expect(mockBoletosRepo.verificarAsientoDisponible).toHaveBeenCalledWith(10, 5);
    expect(mockBoletosRepo.verificarAsientoDisponible).toHaveBeenCalledWith(10, 6);
    expect(mockVentaRepo.uploadComprobante).toHaveBeenCalled();
    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({
        RutaId: 10,
        Total: 20,
        Estado: EstadoVenta.PENDIENTE,
        MetodoPago: 'Transferencia',
        ComprobanteUrl: 'https://cdn.example.com/comprobante.png',
      })
    );
    expect(mockBoletosRepo.insertarBoletos).toHaveBeenCalled();
    expect(resultado.ventaId).toBe(123);
    expect(resultado.total).toBe(20);
  });

  it('debe aprobar directamente la venta cuando el pago es con Tarjeta (Stripe)', async () => {
    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [1],
      precioUnitario: 12,
      metodoPago: 'Tarjeta',
      stripeId: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
      nombres: 'Ana',
      apellidos: 'Gómez',
      cedula: '1803456789',
      fechaNacimiento: '2000-01-01',
      usuarioId: 'usr-111',
    };

    const resultado = await useCase.ejecutar(input);

    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({
        Estado: EstadoVenta.APROBADA_PAGO,
        ComprobanteUrl: 'STRIPE_ID:pi_3MtwBwLkdIwHu7ix28a3tqPa',
      })
    );
    expect(resultado.ventaId).toBe(123);
  });

  it('debe lanzar DomainException si un asiento ya no está disponible', async () => {
    vi.mocked(mockBoletosRepo.verificarAsientoDisponible).mockResolvedValueOnce(false);

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      nombres: 'Carlos',
      apellidos: 'Andrade',
      cedula: '1803456789',
      fechaNacimiento: '1995-05-15',
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('ya no está disponible');
  });

  it('debe exigir comprobante si el método es Transferencia', async () => {
    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5],
      precioUnitario: 10,
      metodoPago: 'Transferencia',
      capturaArchivo: null,
      nombres: 'Carlos',
      apellidos: 'Andrade',
      cedula: '1803456789',
      fechaNacimiento: '1995-05-15',
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('Debe adjuntar el comprobante');
  });

  it('debe ejecutar rollback y cancelar la venta si falla la inserción de boletos', async () => {
    vi.mocked(mockBoletosRepo.insertarBoletos).mockRejectedValue(new Error('Fallo de BD en boletos'));

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      nombres: 'Carlos',
      apellidos: 'Andrade',
      cedula: '1803456789',
      fechaNacimiento: '1995-05-15',
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('La compra fue revertida');
    expect(mockVentaRepo.cancelarVenta).toHaveBeenCalledWith(123);
  });

  it('debe rechazar si falta la cédula o los nombres', async () => {
    const inputSinCedula: any = {
      ruta: { id: 10, origen: 'A', destino: 'B' },
      asientos: [1],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      nombres: 'Test',
      apellidos: 'User',
      cedula: '',
      fechaNacimiento: '1990-01-01',
    };

    await expect(useCase.ejecutar(inputSinCedula)).rejects.toThrow('Cédula del pasajero requerida');
  });
});
