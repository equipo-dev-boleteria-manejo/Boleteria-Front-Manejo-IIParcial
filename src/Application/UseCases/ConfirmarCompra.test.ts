import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmarCompra, ConfirmInput } from './ConfirmarCompra';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';
import { ResolverPrecioAsiento } from './ResolverPrecioAsiento';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import type { CalcularDescuentoVentaDto } from '../Dtos/CalcularDescuentoVentaDto';
import {
  EstadoBoleto,
  EstadoVenta,
  MetodoPago,
} from '../../Domain/Constants/EstadosSistema';

const STRIPE_ID = 'pi_3MtwBwLkdIwHu7ix28a3tqPa';

describe('ConfirmarCompra (Caso de Uso)', () => {
  let mockVentaRepo: IVentaRepository;
  let mockBoletosRepo: IBoletosRepository;
  let mockCalcularDescuento: CalcularDescuentoVenta;
  let mockResolverPrecios: ResolverPrecioAsiento;
  let mockPaymentRepo: IPaymentRepository;
  let useCase: ConfirmarCompra;

  function crearUseCase(opciones?: {
    conResolverPrecios?: boolean;
    conPasarela?: boolean;
  }): ConfirmarCompra {
    return new ConfirmarCompra(
      mockVentaRepo,
      mockBoletosRepo,
      undefined,
      mockCalcularDescuento,
      opciones?.conResolverPrecios ? mockResolverPrecios : undefined,
      opciones?.conPasarela ? mockPaymentRepo : undefined,
    );
  }

  beforeEach(() => {
    mockVentaRepo = {
      crearVenta: vi.fn().mockResolvedValue(123),
      cancelarVenta: vi.fn().mockResolvedValue(undefined),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn(),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn(),
      confirmarVentaTarjeta: vi.fn(),
      rechazarVenta: vi.fn(),
      migrarVentasARuta: vi.fn(),
      uploadComprobante: vi.fn().mockResolvedValue({
        publicUrl: 'https://cdn.example.com/comprobante.png',
      }),
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
      ejecutar: vi.fn((datos: CalcularDescuentoVentaDto) => ({
        numeroCedula: datos.numeroCedula,
        edad: datos.edad,
        tieneDiscapacidad: datos.tieneDiscapacidad,
        precioBase: datos.precioBase,
        categoria: 'SIN_DESCUENTO',
        porcentajeDescuento: 0,
        montoDescuento: 0,
        precioFinal: datos.precioBase,
      })),
    } as unknown as CalcularDescuentoVenta;

    mockResolverPrecios = {
      ejecutar: vi.fn().mockResolvedValue(new Map()),
    } as unknown as ResolverPrecioAsiento;

    mockPaymentRepo = {
      createPaymentIntent: vi.fn(),
      verificarPago: vi.fn().mockResolvedValue({
        id: STRIPE_ID,
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      }),
      cancelarPago: vi.fn().mockResolvedValue(undefined),
    };

    useCase = crearUseCase();
  });

  it('debe registrar una venta pendiente y boletos en validación con Transferencia', async () => {
    const fakeFile = new File(['fake content'], 'recibo.png', {
      type: 'image/png',
    });

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
    const boletosInsertados = vi.mocked(mockBoletosRepo.insertarBoletos).mock
      .calls[0][0] as unknown as Array<Record<string, unknown>>;

    expect(mockBoletosRepo.verificarAsientoDisponible).toHaveBeenCalledWith(10, 5);
    expect(mockBoletosRepo.verificarAsientoDisponible).toHaveBeenCalledWith(10, 6);
    expect(mockVentaRepo.uploadComprobante).toHaveBeenCalled();
    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({
        RutaId: 10,
        Total: 20,
        Estado: EstadoVenta.PENDIENTE,
        MetodoPago: MetodoPago.TRANSFERENCIA,
        ComprobanteUrl: 'https://cdn.example.com/comprobante.png',
      }),
    );
    expect(boletosInsertados[0].Estado).toBe(EstadoBoleto.PROCESO_VALIDACION);
    expect(resultado.ventaId).toBe(123);
    expect(resultado.total).toBe(20);
  });

  it('debe reservar antes de cobrar y confirmar la venta con tarjeta', async () => {
    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [1],
      precioUnitario: 12,
      metodoPago: 'Tarjeta',
      stripeId: STRIPE_ID,
      nombres: 'Ana',
      apellidos: 'Gómez',
      cedula: '1803456789',
      fechaNacimiento: '2000-01-01',
      usuarioId: 'usr-111',
    };

    const resultado = await useCase.ejecutar(input);
    const boletosInsertados = vi.mocked(mockBoletosRepo.insertarBoletos).mock
      .calls[0][0] as unknown as Array<Record<string, unknown>>;

    expect(boletosInsertados[0].Estado).toBe(EstadoBoleto.RESERVADO);
    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({
        Estado: EstadoVenta.PENDIENTE,
        MetodoPago: MetodoPago.TARJETA,
        ComprobanteUrl: null,
        StripePaymentIntentId: STRIPE_ID,
      }),
    );
    expect(mockVentaRepo.confirmarVentaTarjeta).toHaveBeenCalledWith(
      123,
      STRIPE_ID,
      'usr-111',
    );
    expect(mockBoletosRepo.actualizarEstadoPorVenta).toHaveBeenCalledWith(
      123,
      EstadoBoleto.EMITIDO,
    );
    expect(resultado.estado).toBe(EstadoVenta.APROBADA_PAGO);
  });

  it('debe usar el precio oficial del servidor e ignorar el precio del cliente', async () => {
    vi.mocked(mockResolverPrecios.ejecutar).mockResolvedValue(
      new Map([
        [5, 15],
        [6, 15],
      ]),
    );
    useCase = crearUseCase({ conResolverPrecios: true });

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5, 6],
      precioUnitario: 1,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
      pasajeros: [
        {
          asientoId: 5,
          nombres: 'Carlos',
          apellidos: 'Andrade',
          cedula: '1710034065',
          fechaNacimiento: '1995-05-15',
          precioUnitario: 1,
        },
        {
          asientoId: 6,
          nombres: 'María',
          apellidos: 'Andrade',
          cedula: '0926687856',
          fechaNacimiento: '1992-03-20',
          precioUnitario: 1,
        },
      ],
    };

    const resultado = await useCase.ejecutar(input);

    expect(mockResolverPrecios.ejecutar).toHaveBeenCalledWith([5, 6]);
    expect(resultado.total).toBe(30);
    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({ Total: 30 }),
    );
  });

  it('debe rechazar el pago con tarjeta si Stripe no confirma el monto', async () => {
    vi.mocked(mockPaymentRepo.verificarPago).mockResolvedValue({
      id: STRIPE_ID,
      status: 'succeeded',
      amount: 999,
      currency: 'usd',
    });
    useCase = crearUseCase({ conPasarela: true });

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [1],
      precioUnitario: 12,
      metodoPago: 'Tarjeta',
      stripeId: STRIPE_ID,
      nombres: 'Ana',
      apellidos: 'Gómez',
      cedula: '1803456789',
      fechaNacimiento: '2000-01-01',
      usuarioId: 'usr-111',
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(
      'no coincide con el total',
    );
    expect(mockVentaRepo.cancelarVenta).toHaveBeenCalledWith(123);
    expect(mockPaymentRepo.cancelarPago).toHaveBeenCalledWith(STRIPE_ID);
  });

  it('debe exigir rol de oficinista o admin para cobrar en efectivo', async () => {
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

    await expect(useCase.ejecutar(input)).rejects.toThrow(
      'Solo un oficinista o administrador',
    );
    expect(mockVentaRepo.crearVenta).not.toHaveBeenCalled();
  });

  it('debe lanzar DomainException si un asiento ya no está disponible', async () => {
    vi.mocked(mockBoletosRepo.verificarAsientoDisponible).mockResolvedValueOnce(false);

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
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
    vi.mocked(mockBoletosRepo.insertarBoletos).mockRejectedValue(
      new Error('Fallo de BD en boletos'),
    );

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
      nombres: 'Carlos',
      apellidos: 'Andrade',
      cedula: '1803456789',
      fechaNacimiento: '1995-05-15',
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('La compra fue revertida');
    expect(mockVentaRepo.cancelarVenta).toHaveBeenCalledWith(123);
  });

  it('debe rechazar si falta la cédula o los nombres', async () => {
    const inputSinCedula: ConfirmInput = {
      ruta: { id: 10, origen: 'A', destino: 'B' },
      asientos: [1],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
      nombres: 'Test',
      apellidos: 'User',
      cedula: '',
      fechaNacimiento: '1990-01-01',
    };

    await expect(useCase.ejecutar(inputSinCedula)).rejects.toThrow(
      'Cédula del pasajero requerida',
    );
  });

  it('debe registrar un pasajero distinto por asiento y respetar su tarifa', async () => {
    vi.mocked(mockCalcularDescuento.ejecutar).mockImplementation(
      (datos: CalcularDescuentoVentaDto) => ({
        numeroCedula: datos.numeroCedula,
        edad: datos.edad,
        tieneDiscapacidad: datos.tieneDiscapacidad,
        precioBase: datos.precioBase,
        categoria: 'SIN_DESCUENTO',
        porcentajeDescuento: 0,
        montoDescuento: 0,
        precioFinal: datos.precioBase,
      }),
    );

    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5, 6],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
      pasajeros: [
        {
          asientoId: 5,
          nombres: 'Carlos',
          apellidos: 'Andrade',
          cedula: '1710034065',
          fechaNacimiento: '1995-05-15',
          precioUnitario: 10,
        },
        {
          asientoId: 6,
          nombres: 'María',
          apellidos: 'Andrade',
          cedula: '0926687856',
          fechaNacimiento: '1992-03-20',
          precioUnitario: 15,
        },
      ],
      usuarioId: 'usr-456',
    };

    const resultado = await useCase.ejecutar(input);
    const boletosInsertados = vi.mocked(mockBoletosRepo.insertarBoletos).mock
      .calls[0][0] as unknown as Array<Record<string, unknown>>;

    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(
      expect.objectContaining({ Total: 25 }),
    );
    expect(resultado.total).toBe(25);
    expect(boletosInsertados).toHaveLength(2);
    expect(boletosInsertados[0]).toEqual(
      expect.objectContaining({
        AsientoId: 5,
        CedulaPasajero: '1710034065',
        PrecioFinal: 10,
        FechaNacimiento: '1995-05-15',
      }),
    );
    expect(boletosInsertados[1]).toEqual(
      expect.objectContaining({
        AsientoId: 6,
        CedulaPasajero: '0926687856',
        PrecioFinal: 15,
      }),
    );
  });

  it('debe rechazar la misma cédula en dos asientos', async () => {
    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5, 6],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
      pasajeros: [
        {
          asientoId: 5,
          nombres: 'Carlos',
          apellidos: 'Andrade',
          cedula: '1710034065',
          fechaNacimiento: '1995-05-15',
        },
        {
          asientoId: 6,
          nombres: 'Carlos',
          apellidos: 'Andrade',
          cedula: '1710034065',
          fechaNacimiento: '1995-05-15',
        },
      ],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow('no puede repetirse');
    expect(mockVentaRepo.crearVenta).not.toHaveBeenCalled();
  });

  it('debe exigir exactamente un pasajero por cada asiento', async () => {
    const input: ConfirmInput = {
      ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
      asientos: [5, 6],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      rolUsuario: 'oficinista',
      pasajeros: [
        {
          asientoId: 5,
          nombres: 'Carlos',
          apellidos: 'Andrade',
          cedula: '1710034065',
          fechaNacimiento: '1995-05-15',
        },
      ],
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(
      'un pasajero por cada asiento',
    );
    expect(mockVentaRepo.crearVenta).not.toHaveBeenCalled();
  });
});
