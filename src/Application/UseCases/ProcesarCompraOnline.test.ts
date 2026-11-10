import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcesarCompraOnline } from './ProcesarCompraOnline';
import type {
  ConfirmarCompra,
  ConfirmInput,
  ResultadoReservaCompra,
} from './ConfirmarCompra';
import {
  EstadoVenta,
  MetodoPago,
} from '../../Domain/Constants/EstadosSistema';

const STRIPE_ID = 'pi_3MtwBwLkdIwHu7ix28a3tqPa';

function crearReserva(total = 25): ResultadoReservaCompra {
  return {
    ventaId: 77,
    comprobanteUrl: null,
    total,
    estado: EstadoVenta.PENDIENTE,
    stripePaymentIntentId: null,
    descuento: null,
    descuentos: [],
    boletos: [],
  };
}

function crearInput(metodoPago: ConfirmInput['metodoPago']): ConfirmInput {
  return {
    ruta: { id: 10, origen: 'Ambato', destino: 'Quito' },
    asientos: [1],
    metodoPago,
    usuarioId: 'usr-1',
    nombres: 'Ana',
    apellidos: 'Gómez',
    cedula: '1803456789',
    fechaNacimiento: '2000-01-01',
  };
}

describe('ProcesarCompraOnline (Caso de Uso)', () => {
  let confirmarCompra: ConfirmarCompra;
  let reservar: ReturnType<typeof vi.fn>;
  let confirmarReserva: ReturnType<typeof vi.fn>;
  let cancelarReserva: ReturnType<typeof vi.fn>;
  let procesar: ProcesarCompraOnline;

  beforeEach(() => {
    reservar = vi.fn().mockResolvedValue(crearReserva());
    confirmarReserva = vi.fn().mockResolvedValue(undefined);
    cancelarReserva = vi.fn().mockResolvedValue(undefined);

    confirmarCompra = {
      reservar,
      confirmarReserva,
      cancelarReserva,
    } as unknown as ConfirmarCompra;

    procesar = new ProcesarCompraOnline(confirmarCompra);
  });

  it('reserva antes de cobrar y confirma el pago con tarjeta', async () => {
    const cobrar = vi.fn().mockResolvedValue(STRIPE_ID);

    const resultado = await procesar.ejecutar(
      crearInput(MetodoPago.TARJETA),
      cobrar,
    );

    expect(reservar).toHaveBeenCalledTimes(1);
    expect(cobrar).toHaveBeenCalledWith(25);
    expect(confirmarReserva).toHaveBeenCalledWith(77, {
      metodoPago: MetodoPago.TARJETA,
      stripeId: STRIPE_ID,
      total: 25,
      aprobadoPorId: 'usr-1',
    });
    expect(cancelarReserva).not.toHaveBeenCalled();
    expect(resultado.estado).toBe(EstadoVenta.APROBADA_PAGO);
    expect(resultado.stripePaymentIntentId).toBe(STRIPE_ID);
  });

  it('cancela la reserva si Stripe rechaza el cobro', async () => {
    const errorCobro = new Error('Tarjeta rechazada');
    const cobrar = vi.fn().mockRejectedValue(errorCobro);

    await expect(
      procesar.ejecutar(crearInput(MetodoPago.TARJETA), cobrar),
    ).rejects.toThrow('Tarjeta rechazada');

    expect(confirmarReserva).not.toHaveBeenCalled();
    expect(cancelarReserva).toHaveBeenCalledWith(77, undefined);
  });

  it('cancela y reembolsa si la verificación del pago falla', async () => {
    const cobrar = vi.fn().mockResolvedValue(STRIPE_ID);
    confirmarReserva.mockRejectedValueOnce(
      new Error('El monto no coincide con el total de la compra.'),
    );

    await expect(
      procesar.ejecutar(crearInput(MetodoPago.TARJETA), cobrar),
    ).rejects.toThrow('El monto no coincide');

    expect(cancelarReserva).toHaveBeenCalledWith(77, STRIPE_ID);
  });

  it('registra la transferencia sin cobrar con Stripe', async () => {
    const cobrar = vi.fn();

    const resultado = await procesar.ejecutar(
      crearInput(MetodoPago.TRANSFERENCIA),
      cobrar,
    );

    expect(reservar).toHaveBeenCalledTimes(1);
    expect(cobrar).not.toHaveBeenCalled();
    expect(confirmarReserva).not.toHaveBeenCalled();
    expect(resultado.ventaId).toBe(77);
  });

  it('rechaza el pago en efectivo en el canal online', async () => {
    const cobrar = vi.fn();

    await expect(
      procesar.ejecutar(crearInput(MetodoPago.EFECTIVO), cobrar),
    ).rejects.toThrow('efectivo solo se registra en ventanilla');

    expect(reservar).not.toHaveBeenCalled();
    expect(cobrar).not.toHaveBeenCalled();
  });
});
