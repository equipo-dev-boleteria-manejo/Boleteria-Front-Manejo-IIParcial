import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onMounted } from 'vue';
import { useBuses } from './useBuses';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';

const mocks = vi.hoisted(() => ({
  obtenerTodos: vi.fn(),
  obtenerPorId: vi.fn(),
  crearBusEjecutar: vi.fn(),
  actualizarBusEjecutar: vi.fn(),
  reportarIncidenteEjecutar: vi.fn(),
}));

// Fuera de un componente, onMounted no ejecuta nada: se reemplaza por un espía
// para poder comprobar que se registra y lanzar su callback a mano.
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>();
  return { ...actual, onMounted: vi.fn() };
});

// El composable crea sus dependencias adentro: se sustituyen para no tocar Supabase.
vi.mock('../../Infrastructure/Repositories/SupabaseBusRepository', () => ({
  SupabaseBusRepository: class {
    obtenerTodos = mocks.obtenerTodos;
    obtenerPorId = mocks.obtenerPorId;
  },
}));

vi.mock('../../Application/UseCases/CrearBus', () => ({
  CrearBus: class {
    ejecutar = mocks.crearBusEjecutar;
  },
}));

vi.mock('../../Application/UseCases/BusUseCases', () => ({
  ActualizarBus: class {
    ejecutar = mocks.actualizarBusEjecutar;
  },
}));

vi.mock('../../Application/UseCases/ReportarIncidenteOperativo', () => ({
  ReportarIncidenteOperativo: class {
    ejecutar = mocks.reportarIncidenteEjecutar;
  },
}));

describe('useBuses', () => {
  let busA: Bus;
  let busB: Bus;
  let busAveriado: Bus;
  let busReemplazo: Bus;

  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    vi.mocked(onMounted).mockClear();

    busA = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
    busA.id = 5;
    busB = new Bus(1, '30', 'PBB-5678', 40, EstadoBus.INACTIVO);
    busB.id = 6;

    busAveriado = new Bus(2, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
    busAveriado.id = 5;
    busReemplazo = new Bus(2, '30', 'PBB-5678', 40, EstadoBus.ACTIVO);
    busReemplazo.id = 6;

    mocks.obtenerTodos.mockResolvedValue([busA, busB]);
    mocks.crearBusEjecutar.mockResolvedValue(busA);
    mocks.actualizarBusEjecutar.mockResolvedValue(busA);
    mocks.reportarIncidenteEjecutar.mockResolvedValue({ success: true });
    mocks.obtenerPorId.mockImplementation(async (id: number) => {
      if (id === 5) return busAveriado;
      if (id === 6) return busReemplazo;
      return null;
    });
  });

  it('debe cargar todos los buses cuando se monta el composable', async () => {
    const { buses, loading, error } = useBuses();

    expect(onMounted).toHaveBeenCalledTimes(1);
    const alMontar = vi.mocked(onMounted).mock.calls[0][0] as () => Promise<void>;
    await alMontar();

    expect(mocks.obtenerTodos).toHaveBeenCalledTimes(1);
    expect(buses.value.map((bus) => bus.numero)).toEqual(['25', '30']);
    expect(loading.value).toBe(false);
    expect(error.value).toBe('');
  });

  it('debe permitir recargar la lista manualmente con cargarBuses', async () => {
    const { buses, cargarBuses } = useBuses();

    await cargarBuses();
    mocks.obtenerTodos.mockResolvedValue([busA]);
    await cargarBuses();

    expect(mocks.obtenerTodos).toHaveBeenCalledTimes(2);
    expect(buses.value).toHaveLength(1);
  });

  it('debe registrar el error y dejar la lista vacía si falla la carga', async () => {
    mocks.obtenerTodos.mockRejectedValue(new Error('Sin conexión'));
    const { buses, loading, error, cargarBuses } = useBuses();

    await cargarBuses();

    expect(error.value).toBe('Sin conexión');
    expect(buses.value).toEqual([]);
    expect(loading.value).toBe(false);
  });

  it('debe usar un mensaje por defecto si el error de carga no trae mensaje', async () => {
    mocks.obtenerTodos.mockRejectedValue(new Error(''));
    const { error, cargarBuses } = useBuses();

    await cargarBuses();

    expect(error.value).toBe('Error al cargar los buses.');
  });

  it('debe exponer el formulario de nuevo bus con sus valores iniciales', () => {
    const { nuevoBus } = useBuses();

    expect(nuevoBus.value).toEqual({
      cooperativaId: 1,
      numero: '',
      placa: '',
      totalAsientos: 40,
      estructura: 'UnPiso',
    });
  });

  it('debe registrar un bus, limpiar el formulario y recargar la lista', async () => {
    let entradaCapturada: Record<string, unknown> = {};
    mocks.crearBusEjecutar.mockImplementation(async (input: Record<string, unknown>) => {
      entradaCapturada = { ...input };
      return busA;
    });
    const { nuevoBus, registrarBus } = useBuses();
    nuevoBus.value.numero = '25';
    nuevoBus.value.placa = 'PBA-1234';
    nuevoBus.value.estructura = 'DosPisos';

    const resultado = await registrarBus();

    expect(resultado).toBe(true);
    expect(entradaCapturada).toMatchObject({
      cooperativaId: 1,
      numero: '25',
      placa: 'PBA-1234',
      totalAsientos: 40,
      estructura: 'DosPisos',
    });
    expect(nuevoBus.value.numero).toBe('');
    expect(nuevoBus.value.placa).toBe('');
    expect(nuevoBus.value.estructura).toBe('UnPiso');
    expect(mocks.obtenerTodos).toHaveBeenCalledTimes(1);
  });

  it('debe devolver false, registrar el error y conservar el formulario si falla el registro', async () => {
    mocks.crearBusEjecutar.mockRejectedValue(new Error('Placa duplicada'));
    const { nuevoBus, error, loading, registrarBus } = useBuses();
    nuevoBus.value.numero = '25';
    nuevoBus.value.placa = 'PBA-1234';

    const resultado = await registrarBus();

    expect(resultado).toBe(false);
    expect(error.value).toBe('Placa duplicada');
    expect(nuevoBus.value.numero).toBe('25');
    expect(nuevoBus.value.placa).toBe('PBA-1234');
    expect(mocks.obtenerTodos).not.toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it('debe guardar los cambios de un bus sin tocar su estado cuando no se indica', async () => {
    const { guardarBus } = useBuses();

    const resultado = await guardarBus({
      id: 5,
      numero: '25',
      placa: 'PBA-1234',
      totalAsientos: 45,
      estructura: 'DosPisos',
    });

    expect(resultado).toBe(true);
    expect(mocks.actualizarBusEjecutar).toHaveBeenCalledTimes(1);
    expect(mocks.actualizarBusEjecutar).toHaveBeenCalledWith(5, {
      numero: '25',
      placa: 'PBA-1234',
      totalAsientos: 45,
      estructura: 'DosPisos',
    });
    expect(mocks.actualizarBusEjecutar.mock.calls[0][1]).not.toHaveProperty('estado');
    expect(mocks.obtenerTodos).toHaveBeenCalledTimes(1);
  });

  it('debe incluir el estado al guardar si se indica', async () => {
    const { guardarBus } = useBuses();

    await guardarBus({
      id: 5,
      numero: '25',
      placa: 'PBA-1234',
      totalAsientos: 40,
      estructura: 'UnPiso',
      estado: EstadoBus.MANTENIMIENTO,
    });

    expect(mocks.actualizarBusEjecutar.mock.calls[0][1]).toMatchObject({
      estado: EstadoBus.MANTENIMIENTO,
    });
  });

  it('debe devolver false y registrar el error si falla al guardar el bus', async () => {
    mocks.actualizarBusEjecutar.mockRejectedValue(new Error('Bus no encontrado'));
    const { error, loading, guardarBus } = useBuses();

    const resultado = await guardarBus({
      id: 99,
      numero: '25',
      placa: 'PBA-1234',
      totalAsientos: 40,
      estructura: 'UnPiso',
    });

    expect(resultado).toBe(false);
    expect(error.value).toBe('Bus no encontrado');
    expect(mocks.obtenerTodos).not.toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it('debe reportar un incidente enviando la cooperativa del bus y el número del reemplazo', async () => {
    const { reportarIncidenteYRefrescar } = useBuses();

    await reportarIncidenteYRefrescar(5, 6, 'AveriaMecanica', 'Falla en el motor');

    expect(mocks.reportarIncidenteEjecutar).toHaveBeenCalledWith({
      cooperativaId: 2,
      busNumero: '25',
      motivo: 'AveriaMecanica',
      descripcion: 'Falla en el motor',
      fechaIncidente: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      replacementBusNumero: '30',
      reportadoPor: null,
    });
    expect(mocks.obtenerTodos).toHaveBeenCalledTimes(1);
  });

  it('debe reportar un incidente sin reemplazo cuando no se indica uno', async () => {
    const { reportarIncidenteYRefrescar } = useBuses();

    await reportarIncidenteYRefrescar(5, undefined, 'Accidente', 'Choque leve');

    expect(mocks.reportarIncidenteEjecutar).toHaveBeenCalledWith(
      expect.objectContaining({ replacementBusNumero: null })
    );
    expect(mocks.obtenerPorId).toHaveBeenCalledTimes(1);
  });

  it('debe enviar reemplazo nulo si el bus de reemplazo no existe', async () => {
    const { reportarIncidenteYRefrescar } = useBuses();

    await reportarIncidenteYRefrescar(5, 99, 'Otro', '');

    expect(mocks.reportarIncidenteEjecutar).toHaveBeenCalledWith(
      expect.objectContaining({ replacementBusNumero: null })
    );
  });

  it('debe lanzar un error y no reportar nada si el bus averiado no existe', async () => {
    const { error, loading, reportarIncidenteYRefrescar } = useBuses();

    await expect(
      reportarIncidenteYRefrescar(99, undefined, 'Accidente', '')
    ).rejects.toThrow('Bus no encontrado');

    expect(error.value).toBe('Bus no encontrado');
    expect(mocks.reportarIncidenteEjecutar).not.toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it('debe propagar el error del caso de uso al reportar un incidente', async () => {
    mocks.reportarIncidenteEjecutar.mockRejectedValue(new Error('Motivo inválido'));
    const { error, reportarIncidenteYRefrescar } = useBuses();

    await expect(
      reportarIncidenteYRefrescar(5, undefined, 'Inventado', '')
    ).rejects.toThrow('Motivo inválido');

    expect(error.value).toBe('Motivo inválido');
    expect(mocks.obtenerTodos).not.toHaveBeenCalled();
  });
});