import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTickets } from './useTickets';
import { VerHistorialBoletos } from '../../Application/UseCases/VerHistorialBoletos';
import { Boleto } from '../../Domain/Entities/Boleto';

describe('useTickets Composable', () => {
  let mockHistorialUseCase: VerHistorialBoletos;

  beforeEach(() => {
    mockHistorialUseCase = {
      ejecutar: vi.fn().mockResolvedValue([]),
    } as unknown as VerHistorialBoletos;
  });

  it('debe iniciar con estado por defecto', () => {
    const { loading, error, boletos, boletoSeleccionado, tieneBoletos, totalBoletos } = useTickets(mockHistorialUseCase);

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(boletos.value).toEqual([]);
    expect(boletoSeleccionado.value).toBeNull();
    expect(tieneBoletos.value).toBe(false);
    expect(totalBoletos.value).toBe(0);
  });

  it('debe cargar historial de boletos y actualizar computeds', async () => {
    const b1 = new Boleto(1, 1, 1, '1710000009', 'Juan', 'Perez', 15);
    b1.id = 10;
    const b2 = new Boleto(1, 1, 2, '1710000009', 'Ana', 'Perez', 15);
    b2.id = 11;

    vi.mocked(mockHistorialUseCase.ejecutar).mockResolvedValue([b1, b2]);

    const { loading, error, boletos, tieneBoletos, totalBoletos, cargarHistorial } = useTickets(mockHistorialUseCase);

    const promesa = cargarHistorial('1710000009');
    expect(loading.value).toBe(true);

    const lista = await promesa;
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(lista).toHaveLength(2);
    expect(boletos.value).toHaveLength(2);
    expect(tieneBoletos.value).toBe(true);
    expect(totalBoletos.value).toBe(2);
  });

  it('debe manejar error al fallar la consulta de historial', async () => {
    vi.mocked(mockHistorialUseCase.ejecutar).mockRejectedValue(new Error('Fallo de red'));

    const { loading, error, cargarHistorial } = useTickets(mockHistorialUseCase);

    await expect(cargarHistorial('1710000009')).rejects.toThrow('Fallo de red');
    expect(loading.value).toBe(false);
    expect(error.value).toBe('Fallo de red');
  });

  it('debe permitir seleccionar un boleto activo y limpiar estado', () => {
    const b1 = new Boleto(1, 1, 1, '1710000009', 'Juan', 'Perez', 15);
    const { boletoSeleccionado, seleccionarBoleto, limpiar } = useTickets(mockHistorialUseCase);

    seleccionarBoleto(b1);
    expect(boletoSeleccionado.value).toEqual(b1);

    limpiar();
    expect(boletoSeleccionado.value).toBeNull();
  });
});
