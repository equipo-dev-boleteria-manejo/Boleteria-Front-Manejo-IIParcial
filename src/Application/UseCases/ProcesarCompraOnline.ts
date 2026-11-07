/**
 * ProcesarCompraOnline.ts - Orquesta una compra pagada con tarjeta.
 *
 * Orden obligatorio:
 *   1. Reservar asientos y crear la venta pendiente.
 *   2. Cobrar con Stripe.
 *   3. Verificar el pago contra Stripe.
 *   4. Confirmar la venta y emitir los boletos.
 *
 * Si falla cualquier paso posterior a la reserva se cancela la venta y se
 * solicita la cancelación/reembolso del pago.
 */

import {
  EstadoVenta,
  MetodoPago,
} from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import {
  ConfirmarCompra,
  confirmarCompraUseCase as defaultConfirmarCompra,
  type ConfirmInput,
  type ResultadoConfirmacionCompra,
} from './ConfirmarCompra';

export type CobrarConTarjeta = (monto: number) => Promise<string>;

export class ProcesarCompraOnline {
  constructor(
    private confirmarCompra: ConfirmarCompra = defaultConfirmarCompra,
  ) {}

  async ejecutar(
    input: ConfirmInput,
    cobrarConTarjeta: CobrarConTarjeta,
  ): Promise<ResultadoConfirmacionCompra> {
    if (input.metodoPago === MetodoPago.EFECTIVO) {
      throw new DomainException(
        'El pago en efectivo solo se registra en ventanilla.',
        'EFECTIVO_SOLO_VENTANILLA',
      );
    }

    if (input.metodoPago === MetodoPago.TARJETA && typeof cobrarConTarjeta !== 'function') {
      throw new DomainException(
        'No está disponible el formulario de pago con tarjeta.',
        'PASARELA_NO_DISPONIBLE',
      );
    }

    // 1. Reserva primero: el asiento queda bloqueado antes de cobrar.
    const reserva = await this.confirmarCompra.reservar(input);

    if (input.metodoPago === MetodoPago.TRANSFERENCIA) {
      return reserva;
    }

    // 2. Cobro y 3. verificación + confirmación.
    let stripeId: string | undefined;
    try {
      stripeId = await cobrarConTarjeta(reserva.total);

      await this.confirmarCompra.confirmarReserva(reserva.ventaId, {
        metodoPago: input.metodoPago,
        stripeId,
        total: reserva.total,
        aprobadoPorId: input.usuarioId,
      });

      return {
        ...reserva,
        estado: EstadoVenta.APROBADA_PAGO,
        stripePaymentIntentId: stripeId,
      };
    } catch (error: unknown) {
      // 4. Rollback: cancelar venta/boletos y reembolsar si hubo cobro.
      await this.confirmarCompra.cancelarReserva(reserva.ventaId, stripeId);
      throw error;
    }
  }
}

export const procesarCompraOnlineUseCase = new ProcesarCompraOnline(
  defaultConfirmarCompra,
);
