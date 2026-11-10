import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import FrecuenciasAdmin from './FrecuenciasAdmin.vue';
import { renderizar } from '../../testing/renderizarSsr';
import type { FilaFrecuencia, FilaParada } from '../../Composables/presentacionFrecuencias';

/** Estado que la vista recibe del composable; cada test lo configura según el estado a verificar. */
const mocks = vi.hoisted(() => ({ estado: {} as Record<string, unknown> }));

vi.mock('../../Composables/useFrecuencias', () => ({ useFrecuencias: () => mocks.estado }));

const fila = (extras: Partial<FilaFrecuencia> = {}): FilaFrecuencia => ({
  id: 1,
  identificador: 'FR-001',
  origen: 'Quito',
  destino: 'Cuenca',
  ruta: 'Quito → Cuenca',
  horaSalida: '08:30',
  tipo: 'Con paradas',
  dias: 'Todos los días',
  totalParadas: 2,
  tiempoUltimaParada: '4 h',
  codigoAnt: 'ANT-9',
  activa: true,
  faltanParadas: false,
  ...extras,
});

interface EstadoSimulado {
  loading?: boolean;
  error?: string | null;
  /** Todas las frecuencias cargadas (alimentan el resumen). */
  filas?: FilaFrecuencia[];
  /** Filas visibles tras aplicar los filtros; por defecto, todas. */
  visibles?: FilaFrecuencia[];
  seleccionada?: FilaFrecuencia | null;
  paradas?: FilaParada[];
}

function configurar({ loading = false, error = null, filas = [], visibles, seleccionada = null, paradas = [] }: EstadoSimulado) {
  const accion = vi.fn().mockResolvedValue(undefined);
  const activas = filas.filter((f) => f.activa).length;
  mocks.estado = {
    loading: ref(loading),
    error: ref(error),
    filaSeleccionada: ref(seleccionada),
    paradasSeleccionadas: ref(paradas),
    ordenSugeridoParada: ref(1),
    resumen: ref({
      total: filas.length,
      activas,
      inactivas: filas.length - activas,
      conParadas: filas.filter((f) => f.totalParadas > 0).length,
    }),
    busqueda: ref(''),
    filtroEstado: ref('Todas'),
    filasFiltradas: ref(visibles ?? filas),
    reiniciarFiltros: vi.fn(),
    cargarFrecuencias: accion,
    seleccionarFrecuencia: accion,
    limpiarSeleccion: vi.fn(),
    registrarFrecuencia: accion,
    actualizarFrecuencia: accion,
    obtenerDatosEdicion: vi.fn(),
    activarFrecuencia: accion,
    desactivarFrecuencia: accion,
    agregarParadaAFrecuencia: accion,
    actualizarParada: accion,
    eliminarParada: accion,
    limpiarError: vi.fn(),
  };
}

const renderizarVista = () => renderizar(FrecuenciasAdmin, {}, { conPinia: true });

describe('FrecuenciasAdmin', () => {
  beforeEach(() => configurar({}));

  it('sigue el patrón de las vistas del sistema: métricas, barra unificada y catálogo', async () => {
    const { html } = await renderizarVista();

    expect(html).toContain('aria-label="Resumen de frecuencias"');
    for (const titulo of ['Total frecuencias', 'Activas', 'Inactivas', 'Con paradas']) {
      expect(html).toContain(titulo);
    }
    expect(html).toContain('Buscar por origen, destino o código...');
    expect(html).toContain('Estado:');
    expect(html).toContain('Recargar');
    expect(html).toContain('Registrar frecuencia');
  });

  it('no incluye el encabezado propio ni banners de éxito dentro de la vista', async () => {
    configurar({ filas: [fila()] });

    const { html } = await renderizarVista();

    expect(html).not.toContain('Frecuencias y Paradas ANT');
    expect(html).not.toContain('role="status"');
  });

  it('estado CARGANDO: muestra el esqueleto accesible y las métricas pendientes', async () => {
    configurar({ loading: true });

    const { html } = await renderizarVista();

    expect(html).toContain('aria-label="Cargando datos"');
    expect(html).toContain('Cargando registros...');
    expect(html).toContain('—');
    expect(html).not.toContain('No hay frecuencias registradas');
    expect(html).not.toContain('<table');
  });

  it('estado VACÍO (sin datos): invita a registrar la primera frecuencia', async () => {
    const { html } = await renderizarVista();

    expect(html).toContain('No hay frecuencias registradas');
    expect(html).toContain('Registrar primera frecuencia');
    expect(html).not.toContain('<table');
  });

  it('estado VACÍO (filtros sin coincidencias): ofrece restablecer los filtros', async () => {
    configurar({ filas: [fila()], visibles: [] });

    const { html } = await renderizarVista();

    expect(html).toContain('No se encontraron frecuencias');
    expect(html).toContain('Restablecer Filtros');
    expect(html).not.toContain('Registrar primera frecuencia');
  });

  it('estado ERROR sin datos: muestra el mensaje con reintento y no el estado vacío', async () => {
    configurar({ error: 'Sin conexión con el servidor' });

    const { html } = await renderizarVista();

    expect(html).toContain('role="alert"');
    expect(html).toContain('No pudimos cargar las frecuencias');
    expect(html).toContain('Sin conexión con el servidor');
    expect(html).toContain('Reintentar');
    expect(html).not.toContain('No hay frecuencias registradas');
  });

  it('estado DATOS: renderiza una fila por frecuencia con ruta, horario, días y estado', async () => {
    configurar({ filas: [fila(), fila({ id: 2, identificador: 'FR-002', activa: false, tipo: 'Con paradas' })] });

    const { html } = await renderizarVista();

    expect(html).toContain('<table');
    expect(html).toContain('aria-label="Catálogo de frecuencias y horarios ANT"');
    expect(html).toContain('FR-001');
    expect(html).toContain('FR-002');
    expect(html).toContain('ANT: ANT-9');
    expect(html).toContain('Quito → Cuenca');
    expect(html).toContain('08:30');
    expect(html).toContain('Todos los días');
    expect(html).toContain('hasta la última: 4 h');
    expect(html).toContain('Activa');
    expect(html).toContain('Inactiva');
    expect(html).not.toContain('No hay frecuencias registradas');
  });

  it('usa los botones de acción del sistema en cada fila, según el estado', async () => {
    configurar({ filas: [fila(), fila({ id: 2, identificador: 'FR-002', activa: false })] });

    const { html } = await renderizarVista();

    expect(html).toContain('aria-label="Editar la frecuencia FR-001"');
    expect(html).toContain('aria-label="Gestionar las paradas de la frecuencia FR-001"');
    expect(html).toContain('aria-label="Desactivar la frecuencia FR-001"');
    expect(html).toContain('aria-label="Activar la frecuencia FR-002"');
    expect(html).not.toContain('aria-label="Activar la frecuencia FR-001"');
  });

  it('las frecuencias directas no ofrecen gestionar paradas', async () => {
    configurar({
      filas: [fila(), fila({ id: 2, identificador: 'FR-002', tipo: 'Directo', totalParadas: 0 })],
    });

    const { html } = await renderizarVista();

    expect(html).toContain('aria-label="Gestionar las paradas de la frecuencia FR-001"');
    expect(html).not.toContain('aria-label="Gestionar las paradas de la frecuencia FR-002"');
    expect(html).toContain('aria-label="Editar la frecuencia FR-002"');
    expect(html).toContain('Sin paradas (servicio directo)');
  });

  it('una frecuencia con paradas sin ninguna muestra el aviso ámbar y resalta el botón de paradas', async () => {
    configurar({
      filas: [
        fila({ id: 1, identificador: 'FR-001', totalParadas: 0, faltanParadas: true, activa: false }),
        fila({ id: 2, identificador: 'FR-002', totalParadas: 2 }),
      ],
    })

    const { html } = await renderizarVista()

    expect(html.match(/Faltan paradas/g)).toHaveLength(1)
    expect(html).toContain('border-amber-200 bg-amber-50 px-2.5 py-1')
    // El botón "Paradas" de la incompleta usa la variante de advertencia (ámbar).
    expect(html).toMatch(/<button[^>]*aria-label="Gestionar las paradas de la frecuencia FR-001"[^>]*text-amber-700/)
    expect(html).toMatch(/<button[^>]*aria-label="Gestionar las paradas de la frecuencia FR-002"[^>]*text-blue-700/)
  })

  it('muestra el resumen de la lista en el pie de la tabla', async () => {
    configurar({ filas: [fila(), fila({ id: 2, identificador: 'FR-002' })], visibles: [fila()] });

    const { html } = await renderizarVista();

    expect(html).toContain('1 de 2 frecuencias listadas');
  });

  it('marca las métricas con los totales del resumen', async () => {
    configurar({
      filas: [fila(), fila({ id: 2, activa: false, totalParadas: 0 }), fila({ id: 3, totalParadas: 0 })],
    });

    const { html } = await renderizarVista();

    expect(html).toContain('Plantillas registradas');
    expect(html).toContain('Disponibles para programar');
    expect(html).toContain('Fuera de operación');
    expect(html).toContain('Con paradas intermedias');
  });

  it('mantiene cerrados los modales hasta que el usuario los abre', async () => {
    configurar({ filas: [fila()], seleccionada: fila() });

    const { cuerpo } = await renderizarVista();

    expect(cuerpo).not.toContain('form-frecuencia');
    expect(cuerpo).not.toContain('Agregar parada');
  });

  it('no incluye selectores de buses ni asignaciones operativas', async () => {
    configurar({ filas: [fila()], seleccionada: fila() });

    const { html } = await renderizarVista();

    // Palabra completa: "Buscar" (la barra de búsqueda) no cuenta.
    expect(html).not.toMatch(/\bbus(es)?\b/i);
  });
});
