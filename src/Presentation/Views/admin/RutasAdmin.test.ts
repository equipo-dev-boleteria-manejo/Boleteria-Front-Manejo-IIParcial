// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import RutasAdmin from './RutasAdmin.vue';
import ModalHabilitarRuta from '../../Components/ModalHabilitarRuta.vue';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { Bus } from '../../../Domain/Entities/Bus';
import { Frecuencia } from '../../../Domain/Entities/Frecuencia';
import { EstadoRuta } from '../../../Domain/Constants/EstadosSistema';

const mocks = vi.hoisted(() => ({
  rutas: {} as Record<string, unknown>,
  usuarios: {} as Record<string, unknown>,
  habilitar: {} as Record<string, unknown>,
  feedback: {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock('../../Composables/useRutas', () => ({ useRutas: () => mocks.rutas }));
vi.mock('../../Composables/useUsuarios', () => ({ useUsuarios: () => mocks.usuarios }));
vi.mock('../../Composables/useHabilitarRutaDiaria', () => ({ useHabilitarRutaDiaria: () => mocks.habilitar }));
vi.mock('../../Composables/useFeedback', () => ({ useFeedback: () => mocks.feedback }));

const bus = new Bus(1, '25', 'PBA-1234', 40);
bus.id = 10;
const frecuencia = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FR-1');
frecuencia.id = 1;

const crearRuta = (id: number, estado: EstadoRuta = EstadoRuta.PROGRAMADA): Ruta => {
  const ruta = new Ruta(1, 10, '2026-06-15', estado);
  ruta.id = id;
  ruta.horaSalida = '08:00';
  return ruta;
};

const chofer = { id: 'uuid-1', nombreCompleto: 'Ana Pérez' };

interface Opciones {
  rutas?: Ruta[];
  loading?: boolean;
  error?: string | null;
  hayFiltros?: boolean;
}

function configurar({ rutas = [], loading = false, error = null, hayFiltros = false }: Opciones = {}) {
  const lista = ref(rutas);
  mocks.rutas = {
    rutas: lista,
    buses: shallowRef([bus]),
    frecuencias: shallowRef([frecuencia]),
    frecuenciasActivas: computed(() => [frecuencia]),
    busesActivos: computed(() => [bus]),
    loading: ref(loading),
    error: ref(error),
    filtroTexto: ref(''),
    filtroFecha: ref(''),
    filtroEstado: ref('Todas'),
    hayFiltros: computed(() => hayFiltros),
    resumen: computed(() => ({
      total: lista.value.length,
      programadas: lista.value.filter((r) => r.estado === EstadoRuta.PROGRAMADA).length,
      enCurso: lista.value.filter((r) => r.estado === EstadoRuta.EN_CURSO).length,
      finalizadas: 0,
    })),
    filasFiltradas: computed(() =>
      lista.value.map((ruta) => ({ ruta, trayectoEtiqueta: 'Quito → Guayaquil', busEtiqueta: 'Bus #25 (PBA-1234)' })),
    ),
    reiniciarFiltros: vi.fn(),
    cargarRutas: vi.fn().mockResolvedValue(undefined),
    cargarBuses: vi.fn().mockResolvedValue(undefined),
    cargarFrecuencias: vi.fn().mockResolvedValue(undefined),
    iniciarViaje: vi.fn().mockResolvedValue(undefined),
    finalizarViaje: vi.fn().mockResolvedValue(undefined),
    cancelarViaje: vi.fn().mockResolvedValue(undefined),
    asignarChofer: vi.fn().mockResolvedValue(undefined),
  };
  mocks.usuarios = {
    choferesActivos: computed(() => [chofer]),
    loading: ref(false),
    error: ref(null),
    cargarUsuarios: vi.fn().mockResolvedValue(undefined),
  };
  mocks.habilitar = {
    loading: ref(false),
    error: ref<string | null>(null),
    habilitar: vi.fn().mockResolvedValue(undefined),
    esDiaOperativo: vi.fn(() => true),
    limpiar: vi.fn(),
  };
}

async function montar() {
  const wrapper = mount(RutasAdmin, { global: { plugins: [createPinia()], stubs: { teleport: true } } });
  await flushPromises();
  return wrapper;
}

const texto = (wrapper: Awaited<ReturnType<typeof montar>>) => wrapper.text();

describe('RutasAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configurar();
  });

  describe('estructura y estados', () => {
    it('sigue el patrón del sistema: métricas, barra unificada y catálogo, sin encabezado propio', async () => {
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Resumen de rutas"]').exists()).toBe(true);
      for (const titulo of ['Todas las rutas', 'Programadas', 'En curso', 'Finalizadas']) {
        expect(texto(wrapper)).toContain(titulo);
      }
      expect(wrapper.find('#filtro-texto').exists()).toBe(true);
      expect(wrapper.find('#filtro-fecha').exists()).toBe(true);
      expect(wrapper.find('#filtro-estado').exists()).toBe(true);
      expect(texto(wrapper)).toContain('Programar ruta');
      expect(texto(wrapper)).not.toContain('Programación de Rutas Diarias');
    });

    it('estado cargando: muestra el esqueleto accesible y las métricas pendientes', async () => {
      configurar({ loading: true });
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Cargando rutas"]').exists()).toBe(true);
      expect(texto(wrapper)).toContain('—');
      expect(texto(wrapper)).not.toContain('No hay rutas programadas');
    });

    it('estado error sin datos: muestra el mensaje con reintento', async () => {
      configurar({ error: 'No se pudo consultar la programación.' });
      const wrapper = await montar();

      expect(texto(wrapper)).toContain('No pudimos cargar las rutas');
      expect(texto(wrapper)).toContain('No se pudo consultar la programación.');

      const reintentar = wrapper.findAll('button').find((boton) => boton.text() === 'Reintentar');
      await reintentar?.trigger('click');
      expect((mocks.rutas.cargarRutas as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('estado vacío sin filtros: invita a programar la primera ruta', async () => {
      const wrapper = await montar();

      expect(texto(wrapper)).toContain('No hay rutas programadas');
      const boton = wrapper.findAll('button').find((b) => b.text() === 'Programar primera ruta');
      await boton?.trigger('click');
      expect(wrapper.findComponent(ModalHabilitarRuta).props('modelValue')).toBe(true);
    });

    it('estado vacío con filtros: ofrece restablecerlos', async () => {
      configurar({ hayFiltros: true });
      const wrapper = await montar();

      expect(texto(wrapper)).toContain('No se encontraron rutas');
      const boton = wrapper.findAll('button').find((b) => b.text() === 'Restablecer Filtros');
      await boton?.trigger('click');
      expect(mocks.rutas.reiniciarFiltros).toHaveBeenCalled();
    });

    it('con datos: muestra trayecto, unidad, chofer por nombre, estado legible y la paginación del sistema', async () => {
      const ruta = crearRuta(7);
      ruta.choferId = 'uuid-1';
      configurar({ rutas: [ruta, crearRuta(8, EstadoRuta.EN_CURSO)] });
      const wrapper = await montar();

      expect(texto(wrapper)).toContain('Quito → Guayaquil');
      expect(texto(wrapper)).toContain('Bus #25 (PBA-1234)');
      expect(texto(wrapper)).toContain('Ana Pérez');
      expect(texto(wrapper)).not.toContain('uuid-1');
      expect(texto(wrapper)).toContain('Programada');
      expect(texto(wrapper)).toContain('En curso');
      expect(texto(wrapper)).not.toContain('EnCurso');
      // Con pocas rutas no hace falta paginar.
      expect(texto(wrapper)).not.toContain('Mostrando página');
    });

    it('cada estado ofrece solo las acciones que le corresponden', async () => {
      configurar({ rutas: [crearRuta(7), crearRuta(8, EstadoRuta.EN_CURSO)] });
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Iniciar el viaje de la ruta 7"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Cancelar el viaje de la ruta 7"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Finalizar el viaje de la ruta 8"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Iniciar el viaje de la ruta 8"]').exists()).toBe(false);
      expect(wrapper.find('[aria-label="Cancelar el viaje de la ruta 8"]').exists()).toBe(false);
    });
  });

  describe('paginación', () => {
    const rutas = (cantidad: number) => Array.from({ length: cantidad }, (_, indice) => crearRuta(indice + 1));
    const filas = (wrapper: Awaited<ReturnType<typeof montar>>) => wrapper.findAll('tbody tr');

    it('incluye el selector de filas por página del sistema, con 10 por defecto', async () => {
      configurar({ rutas: rutas(3) });
      const wrapper = await montar();

      const selector = wrapper.find('#filtro-tamanio-pagina');
      expect(selector.exists()).toBe(true);
      expect((selector.element as HTMLSelectElement).value).toBe('10');
    });

    it('con más rutas que filas por página muestra la paginación y solo la primera página', async () => {
      configurar({ rutas: rutas(25) });
      const wrapper = await montar();

      expect(filas(wrapper)).toHaveLength(10);
      expect(texto(wrapper)).toContain('Mostrando página');
      expect(texto(wrapper)).toContain('25 rutas');
    });

    it('cambiar el tamaño de página ajusta las filas visibles y vuelve a la primera página', async () => {
      configurar({ rutas: rutas(12) });
      const wrapper = await montar();

      await wrapper.find('#filtro-tamanio-pagina').setValue('5');

      expect(filas(wrapper)).toHaveLength(5);
      expect(texto(wrapper)).toContain('Mostrando página 1 de 3');
    });

    it('el botón Siguiente avanza a la página con las rutas restantes', async () => {
      configurar({ rutas: rutas(12) });
      const wrapper = await montar();

      await wrapper.findAll('button').find((boton) => boton.text().includes('Siguiente'))?.trigger('click');

      expect(filas(wrapper)).toHaveLength(2);
      expect(texto(wrapper)).toContain('Mostrando página 2 de 2');
    });

    it('al cambiar la búsqueda vuelve a la primera página', async () => {
      configurar({ rutas: rutas(12) });
      const wrapper = await montar();
      await wrapper.findAll('button').find((boton) => boton.text().includes('Siguiente'))?.trigger('click');
      expect(texto(wrapper)).toContain('Mostrando página 2');

      (mocks.rutas.filtroTexto as { value: string }).value = 'quito';
      await flushPromises();

      expect(texto(wrapper)).toContain('Mostrando página 1');
    });
  });

  describe('acciones con confirmación y feedback', () => {
    it('iniciar viaje: pide confirmación y, si se acepta, lo inicia con toast de éxito', async () => {
      configurar({ rutas: [crearRuta(7)] });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Iniciar el viaje de la ruta 7"]').trigger('click');
      await flushPromises();

      expect(mocks.feedback.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Iniciar viaje' }));
      expect(mocks.rutas.iniciarViaje).toHaveBeenCalledWith(7);
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('La unidad salió y la ruta quedó En curso.');
    });

    it('si se cancela la confirmación no se ejecuta nada', async () => {
      configurar({ rutas: [crearRuta(7)] });
      mocks.feedback.confirm.mockResolvedValue(false);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Iniciar el viaje de la ruta 7"]').trigger('click');
      await wrapper.find('[aria-label="Cancelar el viaje de la ruta 7"]').trigger('click');
      await flushPromises();

      expect(mocks.rutas.iniciarViaje).not.toHaveBeenCalled();
      expect(mocks.rutas.cancelarViaje).not.toHaveBeenCalled();
      expect(mocks.feedback.showSuccess).not.toHaveBeenCalled();
    });

    it('finalizar viaje confirma y notifica', async () => {
      configurar({ rutas: [crearRuta(8, EstadoRuta.EN_CURSO)] });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Finalizar el viaje de la ruta 8"]').trigger('click');
      await flushPromises();

      expect(mocks.rutas.finalizarViaje).toHaveBeenCalledWith(8);
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El viaje se completó y quedó registrado.');
    });

    it('cancelar viaje confirma y avisa con un toast de advertencia', async () => {
      configurar({ rutas: [crearRuta(7)] });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Cancelar el viaje de la ruta 7"]').trigger('click');
      await flushPromises();

      expect(mocks.rutas.cancelarViaje).toHaveBeenCalledWith(7, 'Cancelado por el despachador');
      expect(mocks.feedback.showWarning).toHaveBeenCalledWith('El viaje fue cancelado.');
    });

    it('si una acción falla muestra un toast de error y no el de éxito', async () => {
      configurar({ rutas: [crearRuta(7)] });
      (mocks.rutas.iniciarViaje as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Iniciar el viaje de la ruta 7"]').trigger('click');
      await flushPromises();

      expect(mocks.feedback.showError).toHaveBeenCalledWith('No se pudo iniciar el viaje.');
      expect(mocks.feedback.showSuccess).not.toHaveBeenCalled();
    });

    it('asignar chofer: el botón se habilita al elegir uno y vincula la ruta con toast', async () => {
      configurar({ rutas: [crearRuta(7)] });
      const wrapper = await montar();
      const asignar = () => wrapper.find('[aria-label="Asignar el chofer elegido a la ruta 7"]');
      expect(asignar().attributes('disabled')).toBeDefined();

      await wrapper.find('[aria-label="Chofer para la ruta 7"]').setValue('uuid-1');
      expect(asignar().attributes('disabled')).toBeUndefined();
      await asignar().trigger('click');
      await flushPromises();

      expect(mocks.rutas.asignarChofer).toHaveBeenCalledWith(7, 'uuid-1');
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El chofer quedó vinculado a la ruta programada.');
    });
  });

  describe('programar ruta', () => {
    it('el modal solo recibe frecuencias y buses activos', async () => {
      const wrapper = await montar();
      const modal = wrapper.findComponent(ModalHabilitarRuta);

      expect(modal.props('frecuencias')).toEqual([frecuencia]);
      expect(modal.props('buses')).toEqual([bus]);
      expect(modal.props('choferes')).toEqual([chofer]);
    });

    it('al habilitar cierra el modal, recarga las rutas y avisa con toast', async () => {
      const wrapper = await montar();
      await wrapper.findAll('button').find((b) => b.text().includes('Programar ruta'))?.trigger('click');
      const payload = { frecuenciaId: 1, busId: 10, fecha: '2026-06-15' };

      wrapper.findComponent(ModalHabilitarRuta).vm.$emit('habilitar', payload);
      await flushPromises();

      expect(mocks.habilitar.habilitar).toHaveBeenCalledWith(payload);
      expect(mocks.rutas.cargarRutas).toHaveBeenCalledTimes(2);
      expect(wrapper.findComponent(ModalHabilitarRuta).props('modelValue')).toBe(false);
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('La ruta fue programada y habilitada correctamente.');
    });

    it('si el servidor la rechaza deja el modal abierto y muestra el toast de error', async () => {
      (mocks.habilitar.habilitar as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('rechazada'));
      (mocks.habilitar.error as { value: string | null }).value = 'La unidad ya tiene un viaje en ese horario.';
      const wrapper = await montar();
      await wrapper.findAll('button').find((b) => b.text().includes('Programar ruta'))?.trigger('click');

      wrapper.findComponent(ModalHabilitarRuta).vm.$emit('habilitar', { frecuenciaId: 1, busId: 10, fecha: '2026-06-15' });
      await flushPromises();

      expect(mocks.feedback.showError).toHaveBeenCalledWith('La unidad ya tiene un viaje en ese horario.');
      expect(mocks.feedback.showSuccess).not.toHaveBeenCalled();
      expect(wrapper.findComponent(ModalHabilitarRuta).props('modelValue')).toBe(true);
    });
  });

  describe('selector de chofer y mensajes de confirmación', () => {
    const otroChofer = { id: 'uuid-2', nombreCompleto: 'Beto Ruiz' };
    const conChoferes = (lista: { id: string; nombreCompleto: string }[]) => {
      mocks.usuarios.choferesActivos = computed(() => lista);
    };

    it('una ruta sin chofer muestra el marcador "Asignar chofer…" y todos los choferes', async () => {
      configurar({ rutas: [crearRuta(7)] });
      conChoferes([chofer, otroChofer]);
      const wrapper = await montar();

      const selector = wrapper.find('[aria-label="Chofer para la ruta 7"]');
      expect((selector.element as HTMLSelectElement).value).toBe('');
      expect(selector.text()).toContain('Asignar chofer…');
      expect(selector.text()).toContain('Ana Pérez');
      expect(selector.text()).toContain('Beto Ruiz');
    });

    it('una ruta con chofer ofrece "Cambiar chofer…" y excluye al chofer que ya tiene', async () => {
      const ruta = crearRuta(7);
      ruta.choferId = 'uuid-1';
      configurar({ rutas: [ruta] });
      conChoferes([chofer, otroChofer]);
      const wrapper = await montar();

      const selector = wrapper.find('[aria-label="Chofer para la ruta 7"]');
      expect(selector.text()).toContain('Cambiar chofer…');
      expect(selector.text()).toContain('Beto Ruiz');
      expect(selector.text()).not.toContain('Ana Pérez');
    });

    it('si no queda ningún otro chofer, no se muestra el selector', async () => {
      const ruta = crearRuta(7);
      ruta.choferId = 'uuid-1';
      configurar({ rutas: [ruta] });
      conChoferes([chofer]);
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Chofer para la ruta 7"]').exists()).toBe(false);
      expect(wrapper.find('[aria-label="Asignar el chofer elegido a la ruta 7"]').exists()).toBe(false);
    });

    it('al cambiar a otro chofer lo asigna a la ruta', async () => {
      const ruta = crearRuta(7);
      ruta.choferId = 'uuid-1';
      configurar({ rutas: [ruta] });
      conChoferes([chofer, otroChofer]);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Chofer para la ruta 7"]').setValue('uuid-2');
      await wrapper.find('[aria-label="Asignar el chofer elegido a la ruta 7"]').trigger('click');
      await flushPromises();

      expect(mocks.rutas.asignarChofer).toHaveBeenCalledWith(7, 'uuid-2');
    });

    it('las confirmaciones nombran el bus como en la tabla y no por su id interno', async () => {
      configurar({ rutas: [crearRuta(7), crearRuta(8, EstadoRuta.EN_CURSO)] });
      mocks.feedback.confirm.mockResolvedValue(false);
      const wrapper = await montar();

      await wrapper.find('[aria-label="Iniciar el viaje de la ruta 7"]').trigger('click');
      await wrapper.find('[aria-label="Cancelar el viaje de la ruta 7"]').trigger('click');
      await wrapper.find('[aria-label="Finalizar el viaje de la ruta 8"]').trigger('click');
      await flushPromises();

      const mensajes = mocks.feedback.confirm.mock.calls.map(([opciones]) => opciones.message as string);
      expect(mensajes).toHaveLength(3);
      for (const mensaje of mensajes) {
        expect(mensaje).toContain('Bus #25 (PBA-1234)');
        expect(mensaje).not.toContain('#10');
      }
    });
  });

  describe('viajes de fechas futuras', () => {
    const rutaFutura = () => {
      const ruta = crearRuta(9);
      ruta.fecha = '2999-01-01';
      return ruta;
    };

    it('"Iniciar viaje" queda bloqueado para una ruta de otra fecha y explica por qué', async () => {
      configurar({ rutas: [rutaFutura()] });
      const wrapper = await montar();

      const iniciar = wrapper.find('[aria-label="Iniciar el viaje de la ruta 9"]');
      expect(iniciar.attributes('disabled')).toBeDefined();
      expect(iniciar.attributes('title')).toBe('Solo se puede iniciar el día del viaje (2999-01-01).');
      // Cancelar sigue disponible.
      expect(wrapper.find('[aria-label="Cancelar el viaje de la ruta 9"]').attributes('disabled')).toBeUndefined();
    });

    it('una ruta de hoy se puede iniciar', async () => {
      const hoy = new Date();
      const ruta = crearRuta(5);
      ruta.fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      configurar({ rutas: [ruta] });
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Iniciar el viaje de la ruta 5"]').attributes('disabled')).toBeUndefined();
    });
  });
});
