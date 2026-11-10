import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVentaDescuento } from './useVentaDescuento';
import { CalcularDescuentoVenta } from '../../Application/UseCases/CalcularDescuentoVenta';
import { ConfirmarCompra, ConfirmInput } from '../../Application/UseCases/ConfirmarCompra';

describe('useVentaDescuento Composable', () => {
  let mockCalcularUseCase: CalcularDescuentoVenta;
  let mockConfirmarUseCase: ConfirmarCompra;

  beforeEach(() => {
    mockCalcularUseCase = {
      ejecutar: vi.fn().mockReturnValue({
        numeroCedula: '1710000009',
        edad: 68,
        tieneDiscapacidad: false,
        precioBase: 20,
        categoria: 'TERCERA_EDAD',
        porcentajeDescuento: 0.5,
        montoDescuento: 10,
        precioFinal: 10,
      }),
    } as unknown as CalcularDescuentoVenta;

    mockConfirmarUseCase = {
      ejecutar: vi.fn().mockResolvedValue({
        ventaId: 888,
        total: 10,
        boletos: [{ id: 1 }],
      }),
    } as unknown as ConfirmarCompra;
  });

  it('debe inicializarse con el estado reactivo limpio', () => {
    const { loading, error, descuento, ultimaVenta, tieneDescuento, precioFinalCalculado } = useVentaDescuento(
      mockCalcularUseCase,
      mockConfirmarUseCase
    );

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(descuento.value).toBeNull();
    expect(ultimaVenta.value).toBeNull();
    expect(tieneDescuento.value).toBe(false);
    expect(precioFinalCalculado.value).toBeNull();
  });

  it('debe calcular el descuento y actualizar las propiedades computadas', () => {
    const { descuento, tieneDescuento, precioFinalCalculado, calcularDescuento } = useVentaDescuento(
      mockCalcularUseCase,
      mockConfirmarUseCase
    );

    const res = calcularDescuento({
      numeroCedula: '1710000009',
      edad: 68,
      tieneDiscapacidad: false,
      precioBase: 20,
    });

    expect(res.categoria).toBe('TERCERA_EDAD');
    expect(descuento.value?.precioFinal).toBe(10);
    expect(tieneDescuento.value).toBe(true);
    expect(precioFinalCalculado.value).toBe(10);
  });

  it('debe gestionar error y loading al confirmar la compra', async () => {
    const { loading, error, ultimaVenta, confirmar } = useVentaDescuento(
      mockCalcularUseCase,
      mockConfirmarUseCase
    );

    const input: ConfirmInput = {
      ruta: { id: 1, origen: 'A', destino: 'B' },
      asientos: [1],
      precioUnitario: 10,
      metodoPago: 'Efectivo',
      nombres: 'Ana',
      apellidos: 'Lopez',
      cedula: '1710000009',
      fechaNacimiento: '1990-01-01',
    };

    const promesa = confirmar(input);
    expect(loading.value).toBe(true);

    const venta = await promesa;
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(venta.ventaId).toBe(888);
    expect(ultimaVenta.value?.ventaId).toBe(888);
  });

  it('debe capturar error cuando falla la confirmación', async () => {
    vi.mocked(mockConfirmarUseCase.ejecutar).mockRejectedValue(new Error('Asiento ocupado'));

    const { loading, error, confirmar } = useVentaDescuento(
      mockCalcularUseCase,
      mockConfirmarUseCase
    );

    const input: any = { ruta: { id: 1 } };

    await expect(confirmar(input)).rejects.toThrow('Asiento ocupado');
    expect(loading.value).toBe(false);
    expect(error.value).toBe('Asiento ocupado');
  });

  it('debe restablecer el estado al invocar limpiar()', () => {
    const { descuento, ultimaVenta, calcularDescuento, limpiar } = useVentaDescuento(
      mockCalcularUseCase,
      mockConfirmarUseCase
    );

    calcularDescuento({
      numeroCedula: '1710000009',
      edad: 68,
      tieneDiscapacidad: false,
      precioBase: 20,
    });
    expect(descuento.value).not.toBeNull();

    limpiar();
    expect(descuento.value).toBeNull();
    expect(ultimaVenta.value).toBeNull();
  });
});
