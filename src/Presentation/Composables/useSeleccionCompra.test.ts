import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeleccionCompra } from './useSeleccionCompra';
import { Asiento } from '../../Domain/Entities/Asiento';
import { SeatType } from '../../Domain/Entities/SeatType';
import { CalcularDescuentoVenta } from '../../Application/UseCases/CalcularDescuentoVenta';
import type { CalcularDescuentoVentaDto } from '../../Application/Dtos/CalcularDescuentoVentaDto';
import type { IAsientoRepository } from '../../Domain/Repositories/IAsientoRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';

const CEDULA_A = '1710034065';
const CEDULA_B = '0926687856';

function crearAsiento(
  id: number,
  numero: string,
  tipo: string,
  disponible = true,
): Asiento {
  const asiento = new Asiento(5, numero, tipo, '1', numero, 1, disponible);
  asiento.id = id;
  return asiento;
}

describe('useSeleccionCompra Composable', () => {
  let asientoRepo: IAsientoRepository;
  let boletosRepo: IBoletosRepository;
  let seatTypeRepo: ISeatTypeRepository;
  let calcularDescuento: CalcularDescuentoVenta;
  let asientos: Asiento[];

  beforeEach(() => {
    asientos = [
      crearAsiento(1, '1', 'Normal'),
      crearAsiento(2, '2', 'VIP'),
      crearAsiento(3, '3', 'Normal', false),
      crearAsiento(4, '4', 'VIP'),
    ];

    asientoRepo = {
      obtenerPorBus: vi.fn().mockResolvedValue(asientos),
      obtenerPorId: vi.fn(),
      crear: vi.fn(),
      crearMasivo: vi.fn(),
      actualizarDisponibilidad: vi.fn(),
      asegurarAsientosDeBus: vi.fn().mockResolvedValue(asientos),
    };

    boletosRepo = {
      insertarBoletos: vi.fn(),
      actualizarEstadoPorVenta: vi.fn(),
      obtenerBoletosPorVenta: vi.fn(),
      obtenerBoletosPorRuta: vi.fn(),
      obtenerBoletosPorUsuario: vi.fn(),
      verificarAsientoDisponible: vi.fn().mockResolvedValue(true),
      obtenerAsientosDisponiblesPorRuta: vi.fn(),
      obtenerAsientosOcupadosPorRuta: vi.fn().mockResolvedValue([2]),
      obtenerBoletoPorId: vi.fn(),
    };

    seatTypeRepo = {
      obtenerTodos: vi.fn(),
      obtenerActivos: vi.fn().mockResolvedValue([
        new SeatType('Normal', '#3498db', 10),
        new SeatType('VIP', '#e74c3c', 15),
      ]),
      obtenerPorId: vi.fn(),
      obtenerPorNombre: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar: vi.fn(),
      existeNombre: vi.fn(),
    };

    calcularDescuento = {
      ejecutar: vi.fn((dto: CalcularDescuentoVentaDto) => {
        const porcentaje = dto.tieneDiscapacidad ? 0.5 : 0;
        return {
          numeroCedula: dto.numeroCedula,
          edad: dto.edad,
          tieneDiscapacidad: dto.tieneDiscapacidad,
          precioBase: dto.precioBase,
          categoria: dto.tieneDiscapacidad ? 'DISCAPACIDAD' : 'SIN_DESCUENTO',
          porcentajeDescuento: porcentaje,
          montoDescuento: Number((dto.precioBase * porcentaje).toFixed(2)),
          precioFinal: Number((dto.precioBase * (1 - porcentaje)).toFixed(2)),
        };
      }),
    } as unknown as CalcularDescuentoVenta;
  });

  function crearComposable() {
    return useSeleccionCompra(
      asientoRepo,
      boletosRepo,
      seatTypeRepo,
      calcularDescuento,
    );
  }

  it('carga el mapa con tarifas por tipo y descarta asientos ocupados o no disponibles', async () => {
    const composable = crearComposable();

    await composable.cargarMapa({ rutaId: 10, busId: 5, totalAsientos: 4 });

    expect(asientoRepo.asegurarAsientosDeBus).toHaveBeenCalledWith(5, 4, undefined);
    expect(boletosRepo.obtenerAsientosOcupadosPorRuta).toHaveBeenCalledWith(10);
    expect(composable.preciosPorTipo.value).toEqual({ Normal: 10, VIP: 15 });
    expect(composable.tarifaBase.value).toBe(10);
    expect(composable.asientosMapa.value).toHaveLength(4);
    expect(composable.asientosOcupados.value).toEqual([2]);
    expect(composable.asientosDisponibles.value).toHaveLength(2);

    expect(composable.alternarAsiento(asientos[1])).toBe(false);
    expect(composable.alternarAsiento(asientos[2])).toBe(false);
    expect(composable.alternarAsiento(asientos[0])).toBe(true);
    expect(composable.asientosSeleccionados.value).toEqual([1]);
  });

  it('calcula el total por asiento y genera los DTOs de compra y ventanilla', async () => {
    const composable = crearComposable();
    await composable.cargarMapa({ rutaId: 10, busId: 5, totalAsientos: 4 });

    composable.alternarAsiento(asientos[0]);
    composable.actualizarDatos(1, {
      nombres: 'Ana',
      apellidos: 'Pérez',
      cedula: CEDULA_A,
      fechaNacimiento: '1990-01-01',
    });

    expect(composable.pasajerosCalculados.value[0].valido).toBe(true);
    expect(composable.pasajerosValidos.value).toBe(true);
    expect(composable.totalBase.value).toBe(10);
    expect(composable.totalConDescuentos.value).toBe(10);
    expect(composable.pasajerosParaConfirmar()).toEqual([
      {
        asientoId: 1,
        nombres: 'Ana',
        apellidos: 'Pérez',
        cedula: CEDULA_A,
        fechaNacimiento: '1990-01-01',
        tieneDiscapacidad: false,
        precioUnitario: 10,
      },
    ]);
    expect(composable.pasajerosParaVentanilla()).toEqual([
      {
        asientoId: 1,
        nombres: 'Ana',
        apellidos: 'Pérez',
        cedula: CEDULA_A,
        fechaNacimiento: '1990-01-01',
        esMenor: false,
        esDiscapacitado: false,
        esTerceraEdad: false,
        descuentoAplicado: 0,
        precioFinal: 10,
      },
    ]);
  });

  it('detecta cédulas repetidas y bloquea la compra', async () => {
    const composable = crearComposable();
    await composable.cargarMapa({ rutaId: 10, busId: 5, totalAsientos: 4 });

    composable.alternarAsiento(asientos[0]);
    composable.alternarAsiento(asientos[3]);
    composable.actualizarDatos(1, {
      nombres: 'Ana',
      apellidos: 'Pérez',
      cedula: CEDULA_A,
      fechaNacimiento: '1990-01-01',
    });
    composable.actualizarDatos(4, {
      nombres: 'Luis',
      apellidos: 'Pérez',
      cedula: CEDULA_A,
      fechaNacimiento: '1992-02-02',
    });

    expect(composable.cedulasDuplicadas.value).toEqual([CEDULA_A]);
    expect(composable.hayCedulasDuplicadas.value).toBe(true);
    expect(composable.pasajerosValidos.value).toBe(false);

    composable.actualizarDatos(4, { cedula: CEDULA_B });
    expect(composable.hayCedulasDuplicadas.value).toBe(false);
    expect(composable.pasajerosValidos.value).toBe(true);
  });

  it('aplica la tarifa de cada tipo de asiento y el descuento individual', async () => {
    const composable = crearComposable();
    await composable.cargarMapa({ rutaId: 10, busId: 5, totalAsientos: 4 });

    composable.alternarAsiento(asientos[0]);
    composable.alternarAsiento(asientos[3]);
    composable.actualizarDatos(1, {
      nombres: 'Ana',
      apellidos: 'Pérez',
      cedula: CEDULA_A,
      fechaNacimiento: '1990-01-01',
    });
    composable.actualizarDatos(4, {
      nombres: 'Luis',
      apellidos: 'Pérez',
      cedula: CEDULA_B,
      fechaNacimiento: '1950-02-02',
      tieneDiscapacidad: true,
    });

    expect(composable.totalBase.value).toBe(25);
    expect(composable.pasajerosCalculados.value[0].precioFinal).toBe(10);
    expect(composable.pasajerosCalculados.value[1].precioFinal).toBe(7.5);
    expect(composable.totalConDescuentos.value).toBe(17.5);
    expect(composable.pasajerosParaConfirmar()[1].precioUnitario).toBe(15);
  });

  it('respeta el máximo de asientos por compra', async () => {
    const composable = crearComposable();
    await composable.cargarMapa({ rutaId: 10, busId: 5, totalAsientos: 4 });
    composable.maxSeleccion.value = 1;

    expect(composable.alternarAsiento(asientos[0])).toBe(true);
    expect(composable.alternarAsiento(asientos[3])).toBe(false);
    expect(composable.asientosSeleccionados.value).toEqual([1]);
    expect(composable.error.value).toContain('hasta 1 asientos');
  });
});
