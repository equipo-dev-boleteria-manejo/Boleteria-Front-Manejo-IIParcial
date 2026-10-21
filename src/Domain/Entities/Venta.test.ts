import { describe, expect, it } from 'vitest';
import { Venta } from './Venta';
import { EstadoVenta, MetodoPago } from '../Constants/EstadosSistema';
import { VentaNoModificableException } from '../Exceptions/VentaException';

describe('Venta (Orden Comercial de Venta)', () => {
  it('se inicializa en estado Pendiente y con método de pago Efectivo por defecto', () => {
    const venta = new Venta(1, 'Quito', 'Guayaquil', 15.5);
    expect(venta.esValida()).toBe(true);
    expect(venta.estado).toBe(EstadoVenta.PENDIENTE);
    expect(venta.metodoPago).toBe(MetodoPago.EFECTIVO);
    expect(venta.puedeModificarse()).toBe(true);
  });

  it('valida que origen y destino no sean iguales', () => {
    const venta = new Venta(1, 'Quito', 'quito', 10.0);
    expect(venta.esValida()).toBe(false);
  });

  it('valida que el total sea un número positivo o cero', () => {
    const ventaInvalida = new Venta(1, 'Quito', 'Ambato', -5.0);
    expect(ventaInvalida.esValida()).toBe(false);

    const ventaValida = new Venta(1, 'Quito', 'Ambato', 0);
    expect(ventaValida.esValida()).toBe(true);
  });

  it('permite aprobar la venta cambiando su estado y asignando el aprobador', () => {
    const venta = new Venta(1, 'Quito', 'Guayaquil', 20.0);
    venta.aprobar('usr-uuid-123');

    expect(venta.estado).toBe(EstadoVenta.APROBADA_PAGO);
    expect(venta.aprobadoPorId).toBe('usr-uuid-123');
    expect(venta.puedeModificarse()).toBe(false);
  });

  it('permite cancelar la venta en estado pendiente', () => {
    const venta = new Venta(1, 'Quito', 'Guayaquil', 20.0);
    venta.cancelar();

    expect(venta.estado).toBe(EstadoVenta.CANCELADA);
    expect(venta.puedeModificarse()).toBe(false);
  });

  it('no permite modificar ni aprobar una venta cancelada', () => {
    const venta = new Venta(1, 'Quito', 'Guayaquil', 20.0);
    venta.id = 99;
    venta.cancelar();

    expect(() => venta.aprobar('usr-uuid-123')).toThrow(VentaNoModificableException);
    expect(() => venta.cancelar()).toThrow(VentaNoModificableException);
    expect(() => venta.adjuntarComprobante('https://example.com/voucher.png')).toThrow(
      VentaNoModificableException,
    );
  });

  it('permite adjuntar URL de comprobante de pago', () => {
    const venta = new Venta(1, 'Quito', 'Guayaquil', 20.0, EstadoVenta.PENDIENTE, MetodoPago.TRANSFERENCIA);
    venta.adjuntarComprobante('https://storage.supabase.co/vouchers/v123.jpg');

    expect(venta.comprobanteUrl).toBe('https://storage.supabase.co/vouchers/v123.jpg');
  });
});
