// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import HojaRutaAdmin from './HojaRutaAdmin.vue';
import { HojaRuta } from '../../../Domain/Entities/HojaRuta';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { Bus } from '../../../Domain/Entities/Bus';
import { Frecuencia, ParadaIntermedia } from '../../../Domain/Entities/Frecuencia';
import { EstadoHojaRuta, EstadoRuta } from '../../../Domain/Constants/EstadosSistema';

const mocks = vi.hoisted(() => ({
  hoja: {} as Record<string, unknown>,
  rutas: {} as Record<string, unknown>,
  feedback: {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock('../../Composables/useHojaRuta', () => ({ useHojaRuta: () => mocks.hoja }));
vi.mock('../../Composables/useRutas', () => ({ useRutas: () => mocks.rutas }));
vi.mock('../../Composables/useFeedback', () => ({ useFeedback: () => mocks.feedback }));

const bus = new Bus(1, '25', 'PBA-1234', 40);
bus.id = 10;
const frecuencia = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FR-1');
frecuencia.id = 1;

const crearRuta = (id: number, hora: string, estado: EstadoRuta = EstadoRuta.PROGRAMADA): Ruta => {
  const ruta = new Ruta(1, 10, '2026-06-15', estado);
  ruta.id = id;
  ruta.horaSalida = hora;
  return ruta;
};

const crearHoja = (id: number, estado: EstadoHojaRuta, rutas: Ruta[] = []): HojaRuta => {
  const hoja = new HojaRuta('2026-06-15', estado);
  hoja.id = id;
  hoja.rutas = rutas;
  return hoja;
};

interface Opciones {
  hojas?: HojaRuta[];
  loading?: boolean;
  error?: string | null;
}

function configurar({ hojas = [], loading = false, error = null }: Opciones = {}) {
  mocks.hoja = {
    hojasRuta: ref(hojas),
    hojaActual: ref(hojas[0] ?? null),
    loading: ref(loading),
    error: ref(error),
    cargarPorFecha: vi.fn().mockResolvedValue(undefined),
    crearHojaDia: vi.fn().mockResolvedValue(undefined),
    agregarTrayecto: vi.fn().mockResolvedValue(true),
    iniciarHoja: vi.fn().mockResolvedValue(undefined),
    finalizarHoja: vi.fn().mockResolvedValue(undefined),
    cancelarHoja: vi.fn().mockResolvedValue(undefined),
    toggleTipoRuta: vi.fn().mockResolvedValue(true),
    limpiar: vi.fn(),
  };
  mocks.rutas = {
    buses: shallowRef([bus]),
    frecuencias: shallowRef([frecuencia]),
    frecuenciasActivas: computed(() => [frecuencia]),
    busesActivos: computed(() => [bus]),
    cargarBuses: vi.fn().mockResolvedValue(undefined),
    cargarFrecuencias: vi.fn().mockResolvedValue(undefined),
    iniciarViaje: vi.fn().mockResolvedValue(undefined),
    finalizarViaje: vi.fn().mockResolvedValue(undefined),
    cancelarViaje: vi.fn().mockResolvedValue(undefined),
  };
}

async function montar() {
  const wrapper = mount(HojaRutaAdmin, { global: { stubs: { teleport: true } } });
  await flushPromises();
  return wrapper;
}

const fn = (nombre: string, origen: Record<string, unknown> = mocks.hoja) => origen[nombre] as ReturnType<typeof vi.fn>;

describe('HojaRutaAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configurar();
  });

  describe('estructura y estados', () => {
    it('sigue el patrón del sistema: métricas, barra con la fecha y formulario de trayecto, sin encabezado propio', async () => {
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Resumen de la hoja de ruta"]').exists()).toBe(true);
      for (const titulo of ['Hojas del día', 'Trayectos', 'En curso', 'Finalizados']) {
        expect(wrapper.text()).toContain(titulo);
      }
      expect(wrapper.find('#fecha-filtro-hoja').exists()).toBe(true);
      expect(wrapper.find('#form-asignar-trayecto').exists()).toBe(true);
      expect(wrapper.text()).toContain('Consultar plan');
      expect(wrapper.text()).not.toContain('Control y Despacho de Hojas de Ruta');
    });

    it('consulta la hoja de la fecha al montar y carga buses y frecuencias', async () => {
      await montar();

      expect(fn('cargarPorFecha')).toHaveBeenCalledTimes(1);
      expect(fn('cargarPorFecha').mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fn('cargarBuses', mocks.rutas)).toHaveBeenCalled();
      expect(fn('cargarFrecuencias', mocks.rutas)).toHaveBeenCalled();
    });

    it('estado cargando: muestra el esqueleto accesible', async () => {
      configurar({ loading: true });
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Cargando hojas de ruta"]').exists()).toBe(true);
      expect(wrapper.text()).not.toContain('Sin programación para esta fecha');
    });

    it('estado error sin hojas: muestra el mensaje con reintento', async () => {
      configurar({ error: 'No se pudo consultar la base.' });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('No pudimos cargar las hojas de ruta');
      expect(wrapper.text()).toContain('No se pudo consultar la base.');
      await wrapper.findAll('button').find((b) => b.text() === 'Reintentar')?.trigger('click');
      expect(fn('cargarPorFecha').mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('estado vacío: invita a crear la hoja del día', async () => {
      const wrapper = await montar();

      expect(wrapper.text()).toContain('Sin programación para esta fecha');
      await wrapper.findAll('button').find((b) => b.text() === 'Crear hoja del día' && b.element.closest('[class*="px-5"]'))
        ?.trigger('click');
      await flushPromises();
      expect(fn('crearHojaDia')).toHaveBeenCalled();
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith(expect.stringContaining('Se generó la hoja de ruta'));
    });

    it('con datos: muestra la hoja, su estado, los trayectos con el bus y las métricas', async () => {
      configurar({
        hojas: [
          crearHoja(5, EstadoHojaRuta.EMITIDA, [
            crearRuta(1, '08:00'),
            crearRuta(2, '09:00', EstadoRuta.EN_CURSO),
            crearRuta(3, '10:00', EstadoRuta.FINALIZADA),
          ]),
        ],
      });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('Hoja de ruta #5');
      expect(wrapper.text()).toContain('Emitida');
      expect(wrapper.text()).toContain('Bus #25 (PBA-1234)');
      expect(wrapper.text()).toContain('En curso');
      expect(wrapper.text()).not.toContain('Sin programación para esta fecha');
      expect(wrapper.text()).not.toContain('Crear hoja del día');
    });
  });

  describe('formulario de trayecto', () => {
    it('vacío: al enviar marca frecuencia y unidad en rojo y no llama al caso de uso', async () => {
      const wrapper = await montar();

      await wrapper.find('#form-asignar-trayecto').trigger('submit');

      expect(fn('agregarTrayecto')).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('Selecciona una frecuencia');
      expect(wrapper.text()).toContain('Selecciona una unidad');
      expect(mocks.feedback.showWarning).not.toHaveBeenCalled();
    });

    it('con datos válidos vincula el trayecto, avisa con toast y limpia el formulario', async () => {
      const wrapper = await montar();

      await wrapper.find('#select-frecuencia-hoja').setValue(1);
      await wrapper.find('#select-bus-hoja').setValue(10);
      await wrapper.find('#form-asignar-trayecto').trigger('submit');
      await flushPromises();

      expect(fn('agregarTrayecto')).toHaveBeenCalledWith(10, 1, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El bus fue vinculado a la frecuencia en la hoja operativa.');
      expect((wrapper.find('#select-bus-hoja').element as HTMLSelectElement).value).toBe('');
    });

    it('si el servidor lo rechaza muestra un toast de error y conserva lo elegido', async () => {
      fn('agregarTrayecto').mockResolvedValue(false);
      (mocks.hoja.error as { value: string | null }).value = 'La unidad ya tiene un viaje en ese horario.';
      const wrapper = await montar();

      await wrapper.find('#select-frecuencia-hoja').setValue(1);
      await wrapper.find('#select-bus-hoja').setValue(10);
      await wrapper.find('#form-asignar-trayecto').trigger('submit');
      await flushPromises();

      expect(mocks.feedback.showError).toHaveBeenCalledWith('La unidad ya tiene un viaje en ese horario.');
      expect(mocks.feedback.showSuccess).not.toHaveBeenCalled();
      expect((wrapper.find('#select-bus-hoja').element as HTMLSelectElement).value).toBe('10');
    });

    it('solo ofrece frecuencias y buses activos', async () => {
      const wrapper = await montar();

      expect(wrapper.find('#select-frecuencia-hoja').text()).toContain('Quito → Guayaquil (08:00)');
      expect(wrapper.find('#select-bus-hoja').text()).toContain('Bus #25 (PBA-1234)');
    });
  });

  describe('fecha de operación', () => {
    it('una fecha inválida muestra el error y no consulta', async () => {
      const wrapper = await montar();
      fn('cargarPorFecha').mockClear();

      await wrapper.find('#fecha-filtro-hoja').setValue('');
      await flushPromises();

      expect(wrapper.text()).toContain('La fecha de operación es obligatoria');
      expect(fn('cargarPorFecha')).not.toHaveBeenCalled();
    });

    it('al cambiar a una fecha válida consulta de nuevo', async () => {
      const wrapper = await montar();
      fn('cargarPorFecha').mockClear();

      await wrapper.find('#fecha-filtro-hoja').setValue('2026-12-01');
      await flushPromises();

      expect(fn('cargarPorFecha')).toHaveBeenCalledWith('2026-12-01');
    });
  });

  describe('acciones sobre la hoja y sus trayectos', () => {
    it('iniciar operación de una hoja en borrador: confirma, ejecuta y notifica', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.BORRADOR)] });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Iniciar la operación de la hoja 5"]').trigger('click');
      await flushPromises();

      expect(fn('iniciarHoja')).toHaveBeenCalledWith(5, expect.any(String));
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('La hoja de ruta fue emitida y está activa.');
    });

    it('cancelar hoja usa una confirmación válida y avisa con advertencia; si se rechaza no hace nada', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.EMITIDA)] });
      mocks.feedback.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Cancelar la hoja 5"]').trigger('click');
      await flushPromises();
      expect(fn('cancelarHoja')).not.toHaveBeenCalled();

      await wrapper.find('[aria-label="Cancelar la hoja 5"]').trigger('click');
      await flushPromises();

      expect(mocks.feedback.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'warning' }));
      expect(fn('cancelarHoja')).toHaveBeenCalledWith(5, 'Cancelada por el supervisor', expect.any(String));
      expect(mocks.feedback.showWarning).toHaveBeenCalledWith('La hoja de ruta fue cancelada.');
    });

    it('una hoja cerrada no ofrece acciones y sus trayectos son de solo lectura', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.CERRADA, [crearRuta(1, '08:00')])] });
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Cerrar la hoja 5"]').exists()).toBe(false);
      expect(wrapper.find('[aria-label="Cancelar la hoja 5"]').exists()).toBe(false);
      expect(wrapper.find('[aria-label^="Iniciar el trayecto"]').exists()).toBe(false);
    });

    it('los botones de cada trayecto funcionan: iniciar confirma, ejecuta y recarga la hoja', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.EMITIDA, [crearRuta(1, '08:00')])] });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();
      fn('cargarPorFecha').mockClear();

      await wrapper.find('[aria-label^="Iniciar el trayecto de las 08:00"]').trigger('click');
      await flushPromises();

      expect(fn('iniciarViaje', mocks.rutas)).toHaveBeenCalledWith(1);
      expect(fn('cargarPorFecha')).toHaveBeenCalledTimes(1);
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El trayecto quedó En curso.');
    });

    it('cancelar un trayecto avisa con advertencia y un fallo muestra el toast de error', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.EMITIDA, [crearRuta(1, '08:00')])] });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label^="Cancelar el trayecto de las 08:00"]').trigger('click');
      await flushPromises();
      expect(fn('cancelarViaje', mocks.rutas)).toHaveBeenCalledWith(1, 'Cancelado desde la hoja de ruta');
      expect(mocks.feedback.showWarning).toHaveBeenCalledWith('El trayecto fue cancelado.');

      fn('cancelarViaje', mocks.rutas).mockRejectedValue(new Error('boom'));
      await wrapper.find('[aria-label^="Cancelar el trayecto de las 08:00"]').trigger('click');
      await flushPromises();
      expect(mocks.feedback.showError).toHaveBeenCalledWith('No se pudo cancelar el trayecto.');
    });

    it('un trayecto de una frecuencia directa no ofrece cambiar la modalidad', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.EMITIDA, [crearRuta(1, '08:00')])] });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('Directo');
      expect(wrapper.find('[aria-label^="Cambiar la modalidad"]').exists()).toBe(false);
    });

    it('cambiar la modalidad de un trayecto de una frecuencia con paradas avisa del resultado', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.EMITIDA, [crearRuta(1, '08:00')])] });
      const conParadas = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FR-1', false);
      conParadas.id = 1;
      conParadas.establecerParadas([new ParadaIntermedia('Santo Domingo', 1, 150)]);
      mocks.rutas.frecuencias = shallowRef([conParadas]);
      const wrapper = await montar();

      await wrapper.find('[aria-label^="Cambiar la modalidad"]').trigger('click');
      await flushPromises();
      expect(fn('toggleTipoRuta')).toHaveBeenCalled();
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('La modalidad del trayecto fue actualizada.');

      fn('toggleTipoRuta').mockResolvedValue(false);
      (mocks.hoja.error as { value: string | null }).value = 'La modalidad solo puede cambiarse mientras la ruta está Programada.';
      await wrapper.find('[aria-label^="Cambiar la modalidad"]').trigger('click');
      await flushPromises();
      expect(mocks.feedback.showError).toHaveBeenCalledWith(
        'La modalidad solo puede cambiarse mientras la ruta está Programada.',
      );
    });
  });

  describe('hoja cerrada o cancelada', () => {
    it('explica que la fecha ya no admite trayectos y bloquea el formulario antes de enviarlo', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.CERRADA)] });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('está cerrada o cancelada y ya no admite más trayectos');
      expect(wrapper.find('#select-frecuencia-hoja').attributes('disabled')).toBeDefined();
      expect(wrapper.find('#select-bus-hoja').attributes('disabled')).toBeDefined();
      expect(wrapper.find('#form-asignar-trayecto button[type="submit"]').attributes('disabled')).toBeDefined();
    });

    it('si se fuerza el envío de todos modos no llama al caso de uso', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.CERRADA)] });
      const wrapper = await montar();

      await wrapper.find('#form-asignar-trayecto').trigger('submit');

      expect(fn('agregarTrayecto')).not.toHaveBeenCalled();
    });

    it('con la hoja abierta, o sin hoja, el formulario sigue disponible y no muestra el aviso', async () => {
      configurar({ hojas: [crearHoja(5, EstadoHojaRuta.EMITIDA)] });
      const abierta = await montar();
      expect(abierta.text()).not.toContain('ya no admite más trayectos');
      expect(abierta.find('#select-bus-hoja').attributes('disabled')).toBeUndefined();

      configurar({ hojas: [] });
      const sinHoja = await montar();
      expect(sinHoja.text()).not.toContain('ya no admite más trayectos');
    });
  });
});
