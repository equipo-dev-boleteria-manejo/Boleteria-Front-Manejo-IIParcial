import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import HojaRutaAdmin from './HojaRutaAdmin.vue';
import { renderizar } from '../../testing/renderizarSsr';
import { useHojaRuta } from '../../Composables/useHojaRuta';
import { useRutas } from '../../Composables/useRutas';
import { HojaRuta } from '../../../Domain/Entities/HojaRuta';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { Bus } from '../../../Domain/Entities/Bus';
import { Frecuencia } from '../../../Domain/Entities/Frecuencia';
import { EstadoHojaRuta, EstadoRuta } from '../../../Domain/Constants/EstadosSistema';
import type { RutaFilaPresentacion } from '../../Composables/useRutas';

vi.mock('../../Composables/useHojaRuta', () => ({ useHojaRuta: vi.fn() }));
vi.mock('../../Composables/useRutas', () => ({ useRutas: vi.fn() }));

function crearEstadoHojaRuta(opciones: {
  hojas?: HojaRuta[];
  loading?: boolean;
  error?: string | null;
} = {}): ReturnType<typeof useHojaRuta> {
  const estado = {
    hojasRuta: ref(opciones.hojas ?? []),
    hojaActual: ref(opciones.hojas?.[0] ?? null),
    loading: ref(opciones.loading ?? false),
    error: ref(opciones.error ?? null),
    cargarPorFecha: vi.fn(),
    crearHojaDia: vi.fn(),
    agregarTrayecto: vi.fn(),
    iniciarHoja: vi.fn(),
    finalizarHoja: vi.fn(),
    cancelarHoja: vi.fn(),
    toggleTipoRuta: vi.fn(),
    limpiar: vi.fn(),
  } satisfies ReturnType<typeof useHojaRuta>;
  return estado;
}

function crearEstadoRutas(): ReturnType<typeof useRutas> {
  const rutas = ref<Ruta[]>([]);
  const estado = {
    rutas,
    buses: ref<Bus[]>([]),
    frecuencias: ref<Frecuencia[]>([]),
    loading: ref(false),
    error: ref<string | null>(null),
    success: ref<string | null>(null),
    filtroEstado: ref('Todas'),
    filtroFecha: ref(''),
    filtroTexto: ref(''),
    paginaActual: ref(1),
    itemsPorPagina: 8,
    totalFiltradas: computed(() => rutas.value.length),
    totalPaginas: computed(() => 1),
    rutasFiltradas: computed(() => rutas.value),
    rutasProgramadas: computed(() =>
      rutas.value.filter((ruta) => ruta.estado === EstadoRuta.PROGRAMADA),
    ),
    rutasEnCurso: computed(() =>
      rutas.value.filter((ruta) => ruta.estado === EstadoRuta.EN_CURSO),
    ),
    rutasFinalizadas: computed(() =>
      rutas.value.filter((ruta) => ruta.estado === EstadoRuta.FINALIZADA),
    ),
    rutasPaginadas: computed<RutaFilaPresentacion[]>(() => []),
    cargarRutas: vi.fn(),
    cargarBuses: vi.fn(),
    cargarFrecuencias: vi.fn(),
    cambiarEstado: vi.fn(),
    iniciarViaje: vi.fn(),
    finalizarViaje: vi.fn(),
    cancelarViaje: vi.fn(),
    asignarChofer: vi.fn(),
    eliminarRuta: vi.fn(),
    limpiar: vi.fn(),
  } satisfies ReturnType<typeof useRutas>;
  return estado;
}

describe('HojaRutaAdmin View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useHojaRuta).mockReturnValue(crearEstadoHojaRuta());
    vi.mocked(useRutas).mockReturnValue(crearEstadoRutas());
  });

  it('renderiza encabezado, selector de fecha y formulario de trayecto', async () => {
    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('Control y Despacho de Hojas de Ruta');
    expect(html).toContain('Fecha de Operación');
    expect(html).toContain('Consultar Plan');
    expect(html).toContain('Asignar Nuevo Trayecto Operativo');
    expect(html).toContain('Frecuencia / Horario');
    expect(html).toContain('Unidad / Bus');
    expect(html).toContain('Vincular al Plan');
  });

  it('renderiza el estado de carga de hojas', async () => {
    vi.mocked(useHojaRuta).mockReturnValue(crearEstadoHojaRuta({ loading: true }));

    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('aria-label="Cargando hojas de ruta"');
    expect(html).toContain('Cargando hojas de ruta operativas...');
    expect(html).not.toContain('Sin programación activa para esta fecha');
  });

  it('renderiza el error recibido del composable', async () => {
    vi.mocked(useHojaRuta).mockReturnValue(
      crearEstadoHojaRuta({ error: 'No se pudo consultar la hoja.' }),
    );

    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('role="alert"');
    expect(html).toContain('No se pudo consultar la hoja.');
  });

  it('renderiza el estado vacío cuando no hay hojas en la fecha', async () => {
    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('Sin programación activa para esta fecha');
    expect(html).toContain('Crear Hoja del Día Ahora');
    expect(html).not.toContain('Hoja de Ruta #1');
  });

  it('renderiza la hoja y sus trayectos cuando hay datos', async () => {
    const hoja = new HojaRuta('2026-06-15', EstadoHojaRuta.BORRADOR);
    hoja.id = 1;
    vi.mocked(useHojaRuta).mockReturnValue(crearEstadoHojaRuta({ hojas: [hoja] }));

    const { html } = await renderizar(HojaRutaAdmin, {}, { conPinia: true });

    expect(html).toContain('Hoja de Ruta #1');
    expect(html).toContain('Iniciar Operación');
    expect(html).toContain('Sin trayectos asignados');
  });
});
