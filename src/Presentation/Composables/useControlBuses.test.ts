import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { useControlBuses } from './useControlBuses';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import type { CrearBusInput } from '../../Application/UseCases/CrearBus';
import type { ReactivarBusResponse } from '../../Application/UseCases/ReactivarBus';
import type { ReactivarBusDto } from '../../Application/Dtos/ReactivarBusDto';

// El composable crea por defecto el repositorio de Supabase; se reemplaza por una
// clase vacía para que el test no cargue el cliente real ni necesite variables de entorno.
vi.mock('../../Infrastructure/Repositories/SupabaseBusRepository', () => ({
  SupabaseBusRepository: class {},
}));

describe('useControlBuses', () => {
  let busActivo: Bus;
  let busInactivo: Bus;
  let deps: {
    obtenerBusesDisponibles: { ejecutar: Mock<(cooperativaId: number) => Promise<Bus[]>> };
    crearBus: { ejecutar: Mock<(input: CrearBusInput) => Promise<Bus>> };
    reactivarBus: { ejecutar: Mock<(input: ReactivarBusDto) => Promise<ReactivarBusResponse>> };
    activarBus: { ejecutar: Mock<(busId: number) => Promise<Bus>> };
    desactivarBus: { ejecutar: Mock<(busId: number) => Promise<Bus>> };
  };

  const respuestaReactivar: ReactivarBusResponse = {
    success: true,
    busReactivado: { id: 5, numero: '25', estado: EstadoBus.ACTIVO },
    reactivadoPor: 'admin-1',
    motivo: 'Reparación completada',
    mensaje: 'Bus 25 ha sido reactivado exitosamente.',
  };

  const inputBus: CrearBusInput = {
    cooperativaId: 1,
    numero: '25',
    placa: 'PBA-1234',
    totalAsientos: 40,
  };

  beforeEach(() => {
    busActivo = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
    busActivo.id = 5;

    busInactivo = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.INACTIVO);
    busInactivo.id = 5;

    deps = {
      obtenerBusesDisponibles: {
        ejecutar: vi
          .fn<(cooperativaId: number) => Promise<Bus[]>>()
          .mockResolvedValue([busActivo]),
      },
      crearBus: {
        ejecutar: vi.fn<(input: CrearBusInput) => Promise<Bus>>().mockResolvedValue(busActivo),
      },
      reactivarBus: {
        ejecutar: vi
          .fn<(input: ReactivarBusDto) => Promise<ReactivarBusResponse>>()
          .mockResolvedValue(respuestaReactivar),
      },
      activarBus: {
        ejecutar: vi.fn<(busId: number) => Promise<Bus>>().mockResolvedValue(busActivo),
      },
      desactivarBus: {
        ejecutar: vi.fn<(busId: number) => Promise<Bus>>().mockResolvedValue(busInactivo),
      },
    };
  });

  it('debe cargar los buses disponibles usando la cooperativa 1 por defecto', async () => {
    const { buses, loading, error, cargarBusesActivos } = useControlBuses({ dependencies: deps });

    const resultado = await cargarBusesActivos();

    expect(resultado).toEqual([busActivo]);
    expect(buses.value).toEqual([busActivo]);
    expect(deps.obtenerBusesDisponibles.ejecutar).toHaveBeenCalledWith(1);
    expect(loading.value).toBe(false);
    expect(error.value).toBe('');
  });

  it('debe usar el cooperativaId recibido en las opciones', async () => {
    const { cargarBusesActivos } = useControlBuses({ cooperativaId: 3, dependencies: deps });

    await cargarBusesActivos();

    expect(deps.obtenerBusesDisponibles.ejecutar).toHaveBeenCalledWith(3);
  });

  it('debe mantener loading en true mientras carga y en false al terminar', async () => {
    let resolver!: (buses: Bus[]) => void;
    deps.obtenerBusesDisponibles.ejecutar.mockReturnValue(
      new Promise<Bus[]>((resolve) => {
        resolver = resolve;
      })
    );
    const { loading, cargarBusesActivos } = useControlBuses({ dependencies: deps });

    const promesa = cargarBusesActivos();
    expect(loading.value).toBe(true);

    resolver([]);
    await promesa;
    expect(loading.value).toBe(false);
  });

  it('debe registrar el error y devolver una lista vacía si falla la carga', async () => {
    deps.obtenerBusesDisponibles.ejecutar.mockRejectedValue(new Error('Sin conexión'));
    const { buses, error, loading, cargarBusesActivos } = useControlBuses({ dependencies: deps });

    const resultado = await cargarBusesActivos();

    expect(resultado).toEqual([]);
    expect(buses.value).toEqual([]);
    expect(error.value).toBe('Sin conexión');
    expect(loading.value).toBe(false);
  });

  it('debe crear un bus y reportar el éxito con su número', async () => {
    const { success, error, crearBus } = useControlBuses({ dependencies: deps });

    const resultado = await crearBus(inputBus);

    expect(resultado).toBe(busActivo);
    expect(deps.crearBus.ejecutar).toHaveBeenCalledWith(inputBus);
    expect(success.value).toBe('Bus 25 creado correctamente.');
    expect(error.value).toBe('');
  });

  it('debe devolver null y registrar el error si falla la creación del bus', async () => {
    deps.crearBus.ejecutar.mockRejectedValue(new Error('Placa duplicada'));
    const { success, error, crearBus } = useControlBuses({ dependencies: deps });

    const resultado = await crearBus(inputBus);

    expect(resultado).toBeNull();
    expect(error.value).toBe('Placa duplicada');
    expect(success.value).toBe('');
  });

  it('debe usar un mensaje por defecto si el error no trae mensaje', async () => {
    deps.crearBus.ejecutar.mockRejectedValue(new Error(''));
    const { error, crearBus } = useControlBuses({ dependencies: deps });

    await crearBus(inputBus);

    expect(error.value).toBe('No se pudo crear el bus.');
  });

  it('debe reactivar un bus enviando los datos de auditoría y mostrar el mensaje del caso de uso', async () => {
    const { success, reactivarBus } = useControlBuses({ dependencies: deps });

    const resultado = await reactivarBus(5, 'admin-1', 'Reparación completada');

    expect(resultado).toEqual(respuestaReactivar);
    expect(deps.reactivarBus.ejecutar).toHaveBeenCalledWith({
      busId: 5,
      reactivadoPor: 'admin-1',
      motivo: 'Reparación completada',
    });
    expect(success.value).toBe(respuestaReactivar.mensaje);
  });

  it('debe devolver null y registrar el error si falla la reactivación', async () => {
    deps.reactivarBus.ejecutar.mockRejectedValue(new Error('Estado no reactivable'));
    const { error, reactivarBus } = useControlBuses({ dependencies: deps });

    const resultado = await reactivarBus(5, 'admin-1');

    expect(resultado).toBeNull();
    expect(error.value).toBe('Estado no reactivable');
  });

  it('debe activar un bus y reportar el éxito', async () => {
    const { success, activarBus } = useControlBuses({ dependencies: deps });

    const resultado = await activarBus(5);

    expect(resultado).toBe(busActivo);
    expect(deps.activarBus.ejecutar).toHaveBeenCalledWith(5);
    expect(success.value).toBe('Bus 25 activado correctamente.');
  });

  it('debe desactivar un bus y reportar el éxito', async () => {
    const { success, desactivarBus } = useControlBuses({ dependencies: deps });

    const resultado = await desactivarBus(5);

    expect(resultado).toBe(busInactivo);
    expect(deps.desactivarBus.ejecutar).toHaveBeenCalledWith(5);
    expect(success.value).toBe('Bus 25 desactivado correctamente.');
  });

  it('debe devolver null y registrar el error si falla la activación', async () => {
    deps.activarBus.ejecutar.mockRejectedValue(new Error('Bus 5 no encontrado'));
    const { error, activarBus } = useControlBuses({ dependencies: deps });

    const resultado = await activarBus(5);

    expect(resultado).toBeNull();
    expect(error.value).toBe('Bus 5 no encontrado');
  });

  it('debe devolver null y registrar el error si falla la desactivación', async () => {
    deps.desactivarBus.ejecutar.mockRejectedValue(new Error('Bus 5 no encontrado'));
    const { error, desactivarBus } = useControlBuses({ dependencies: deps });

    const resultado = await desactivarBus(5);

    expect(resultado).toBeNull();
    expect(error.value).toBe('Bus 5 no encontrado');
  });

  it('debe liberar un bus delegando en el caso de uso de activación', async () => {
    const { liberarBus } = useControlBuses({ dependencies: deps });

    const resultado = await liberarBus(5);

    expect(resultado).toBe(busActivo);
    expect(deps.activarBus.ejecutar).toHaveBeenCalledWith(5);
  });

  it('debe limpiar el error anterior al iniciar una nueva operación exitosa', async () => {
    deps.activarBus.ejecutar
      .mockRejectedValueOnce(new Error('Falla temporal'))
      .mockResolvedValueOnce(busActivo);
    const { error, success, activarBus } = useControlBuses({ dependencies: deps });

    await activarBus(5);
    expect(error.value).toBe('Falla temporal');

    await activarBus(5);
    expect(error.value).toBe('');
    expect(success.value).toBe('Bus 25 activado correctamente.');
  });
});