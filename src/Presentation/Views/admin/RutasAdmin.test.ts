import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import RutasAdmin from './RutasAdmin.vue';
import { renderizar } from '../../testing/renderizarSsr';
import { useRutas } from '../../Composables/useRutas';
import { useUsuarios } from '../../Composables/useUsuarios';
import { useHabilitarRutaDiaria } from '../../Composables/useHabilitarRutaDiaria';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { Bus } from '../../../Domain/Entities/Bus';
import { Frecuencia } from '../../../Domain/Entities/Frecuencia';
import { Usuario } from '../../../Domain/Entities/Usuario';
import { Cedula } from '../../../Domain/ValueObjects/Cedula';
import { EstadoRuta, RolUsuario } from '../../../Domain/Constants/EstadosSistema';
import type { RutaFilaPresentacion } from '../../Composables/useRutas';

vi.mock('../../Composables/useRutas', () => ({ useRutas: vi.fn() }));
vi.mock('../../Composables/useUsuarios', () => ({ useUsuarios: vi.fn() }));
vi.mock('../../Composables/useHabilitarRutaDiaria', () => ({
  useHabilitarRutaDiaria: vi.fn(),
}));

function crearEstadoRutas(opciones: {
  rutas?: Ruta[];
  loading?: boolean;
  error?: string | null;
} = {}): ReturnType<typeof useRutas> {
  const rutasRef = ref<Ruta[]>(opciones.rutas ?? []);
  const estado = {
    rutas: rutasRef,
    buses: ref<Bus[]>([]),
    frecuencias: ref<Frecuencia[]>([]),
    loading: ref(opciones.loading ?? false),
    error: ref(opciones.error ?? null),
    success: ref<string | null>(null),
    filtroEstado: ref('Todas'),
    filtroFecha: ref(''),
    filtroTexto: ref(''),
    paginaActual: ref(1),
    itemsPorPagina: 8,
    totalFiltradas: computed(() => rutasRef.value.length),
    totalPaginas: computed(() => 1),
    rutasFiltradas: computed(() => rutasRef.value),
    rutasProgramadas: computed(() =>
      rutasRef.value.filter((ruta) => ruta.estado === EstadoRuta.PROGRAMADA),
    ),
    rutasEnCurso: computed(() =>
      rutasRef.value.filter((ruta) => ruta.estado === EstadoRuta.EN_CURSO),
    ),
    rutasFinalizadas: computed(() =>
      rutasRef.value.filter((ruta) => ruta.estado === EstadoRuta.FINALIZADA),
    ),
    rutasPaginadas: computed<RutaFilaPresentacion[]>(() =>
      rutasRef.value.map((ruta) => ({
        ruta,
        trayectoEtiqueta: 'Quito → Guayaquil',
        busEtiqueta: 'Bus #25 (PBA-1234)',
      })),
    ),
    cargarRutas: vi.fn(async () => rutasRef.value),
    cargarBuses: vi.fn(async () => [] as Bus[]),
    cargarFrecuencias: vi.fn(async () => [] as Frecuencia[]),
    cambiarEstado: vi.fn(async () => rutasRef.value[0] ?? new Ruta(1, 1, '2026-06-15')),
    iniciarViaje: vi.fn(async () => rutasRef.value[0] ?? new Ruta(1, 1, '2026-06-15')),
    finalizarViaje: vi.fn(async () => rutasRef.value[0] ?? new Ruta(1, 1, '2026-06-15')),
    cancelarViaje: vi.fn(async () => rutasRef.value[0] ?? new Ruta(1, 1, '2026-06-15')),
    asignarChofer: vi.fn(async () => rutasRef.value[0] ?? new Ruta(1, 1, '2026-06-15')),
    eliminarRuta: vi.fn(async () => undefined),
    limpiar: vi.fn(),
  } satisfies ReturnType<typeof useRutas>;
  return estado;
}

function crearEstadoUsuarios(): ReturnType<typeof useUsuarios> {
  const usuarios = ref<Usuario[]>([]);
  const usuario = new Usuario(
    'chofer@example.com',
    new Cedula('0926687856'),
    'Carlos',
    'Perez',
    RolUsuario.CHOFER,
  );
  const estado = {
    usuarios,
    choferesActivos: computed(() => [] as (Usuario & { id: string })[]),
    loading: ref(false),
    error: ref<string | null>(null),
    mensajeExito: ref<string | null>(null),
    filtroRol: ref('Todos'),
    busqueda: ref(''),
    paginaActual: ref(1),
    registrosPorPagina: ref(10),
    usuariosFiltrados: computed(() => usuarios.value),
    totalUsuarios: computed(() => usuarios.value.length),
    totalPaginas: computed(() => 1),
    usuariosPaginados: computed(() => usuarios.value),
    limpiarMensajes: vi.fn(),
    cargarUsuarios: vi.fn(async () => undefined),
    crear: vi.fn(async () => usuario),
    actualizar: vi.fn(async () => usuario),
    desactivar: vi.fn(async () => undefined),
    toggleActivo: vi.fn(async () => undefined),
    existeCedula: vi.fn(async () => false),
    existeEmail: vi.fn(async () => false),
  } satisfies ReturnType<typeof useUsuarios>;
  return estado;
}

describe('RutasAdmin View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRutas).mockReturnValue(crearEstadoRutas());
    vi.mocked(useUsuarios).mockReturnValue(crearEstadoUsuarios());
    vi.mocked(useHabilitarRutaDiaria).mockReturnValue({
      loading: ref(false),
      error: ref(null),
      habilitar: vi.fn(),
      esDiaOperativo: vi.fn(() => true),
      limpiar: vi.fn(),
      rutaCreada: ref(null),
    } as ReturnType<typeof useHabilitarRutaDiaria>);
  });

  it('renderiza encabezado, métricas, búsqueda y filtro de fecha', async () => {
    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('Programación de Rutas Diarias');
    expect(html).toContain('Control operativo de viajes');
    expect(html).toContain('Programar Ruta');
    expect(html).toContain('Todas las Rutas');
    expect(html).toContain('Programadas');
    expect(html).toContain('En Curso');
    expect(html).toContain('Finalizadas');
    expect(html).toContain('id="filtro-texto"');
    expect(html).toContain('id="filtro-fecha"');
  });

  it('renderiza estado de carga', async () => {
    vi.mocked(useRutas).mockReturnValue(crearEstadoRutas({ loading: true }));

    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('aria-label="Cargando rutas"');
    expect(html).toContain('Cargando rutas del sistema...');
    expect(html).not.toContain('No se encontraron rutas');
  });

  it('renderiza el error recibido del composable', async () => {
    vi.mocked(useRutas).mockReturnValue(
      crearEstadoRutas({ error: 'No se pudo consultar la programación.' }),
    );

    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('role="alert"');
    expect(html).toContain('No se pudo consultar la programación.');
  });

  it('renderiza el estado vacío sin datos', async () => {
    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('No se encontraron rutas');
    expect(html).toContain('Aún no se han programado rutas');
    expect(html).not.toContain('Listado de Rutas Programadas');
  });

  it('renderiza la fila formateada y sus acciones con datos', async () => {
    const ruta = new Ruta(1, 10, '2026-06-15', EstadoRuta.PROGRAMADA);
    ruta.id = 7;
    ruta.horaSalida = '08:00';
    vi.mocked(useRutas).mockReturnValue(crearEstadoRutas({ rutas: [ruta] }));

    const { html } = await renderizar(RutasAdmin, {}, { conPinia: true });

    expect(html).toContain('Listado de Rutas Programadas');
    expect(html).toContain('Quito → Guayaquil');
    expect(html).toContain('Bus #25 (PBA-1234)');
    expect(html).toContain('2026-06-15');
    expect(html).toContain('Iniciar Viaje');
    expect(html).toContain('Cancelar');
  });
});
