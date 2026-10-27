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
  tipo: 'Directo',
  dias: 'Todos los días',
  totalParadas: 2,
  tiempoUltimaParada: '4 h',
  codigoAnt: 'ANT-9',
  activa: true,
  ...extras,
});

interface EstadoSimulado {
  loading?: boolean;
  error?: string | null;
  filas?: FilaFrecuencia[];
  seleccionada?: FilaFrecuencia | null;
  paradas?: FilaParada[];
}

function configurar({ loading = false, error = null, filas = [], seleccionada = null, paradas = [] }: EstadoSimulado) {
  const accion = vi.fn().mockResolvedValue(undefined);
  mocks.estado = {
    loading: ref(loading),
    error: ref(error),
    filasFrecuencias: ref(filas),
    filaSeleccionada: ref(seleccionada),
    paradasSeleccionadas: ref(paradas),
    ordenSugeridoParada: ref(1),
    cargarFrecuencias: accion,
    buscarPorTramo: accion,
    seleccionarFrecuencia: accion,
    limpiarSeleccion: vi.fn(),
    registrarFrecuencia: accion,
    activarFrecuencia: accion,
    desactivarFrecuencia: accion,
    agregarParadaAFrecuencia: accion,
    eliminarParada: accion,
    limpiarError: vi.fn(),
  };
}

const renderizarVista = () => renderizar(FrecuenciasAdmin, {}, { conPinia: true });

describe('FrecuenciasAdmin', () => {
  beforeEach(() => configurar({}));

  it('muestra el encabezado, el botón de registro y la búsqueda por tramo', async () => {
    const { html } = await renderizarVista();

    expect(html).toContain('Frecuencias y Paradas ANT');
    expect(html).toContain('+ Nueva frecuencia');
    expect(html).toContain('Buscar frecuencias por tramo');
    expect(html).toContain('Ver todas');
  });

  it('estado CARGANDO: muestra el indicador de carga y no la tabla ni el vacío', async () => {
    configurar({ loading: true });

    const { html } = await renderizarVista();

    expect(html).toContain('Consultando frecuencias...');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('No se encontraron frecuencias');
    expect(html).not.toContain('<table');
  });

  it('estado VACÍO: muestra el mensaje amigable con sus acciones', async () => {
    const { html } = await renderizarVista();

    expect(html).toContain('No se encontraron frecuencias');
    expect(html).toContain('Registrar la primera');
    expect(html).not.toContain('<table');
  });

  it('estado ERROR: muestra el mensaje con reintento y no el estado vacío', async () => {
    configurar({ error: 'Sin conexión con el servidor' });

    const { html } = await renderizarVista();

    expect(html).toContain('role="alert"');
    expect(html).toContain('Sin conexión con el servidor');
    expect(html).toContain('Reintentar');
    expect(html).not.toContain('No se encontraron frecuencias');
  });

  it('estado DATOS: renderiza una fila por frecuencia con ruta, horario, días y estado', async () => {
    configurar({ filas: [fila(), fila({ id: 2, identificador: 'FR-002', activa: false, tipo: 'Con paradas' })] });

    const { html } = await renderizarVista();

    expect(html).toContain('<table');
    expect(html).toContain('FR-001');
    expect(html).toContain('FR-002');
    expect(html).toContain('Quito → Cuenca');
    expect(html).toContain('08:30');
    expect(html).toContain('Todos los días');
    expect(html).toContain('Hasta la última: 4 h');
    expect(html).toContain('Activa');
    expect(html).toContain('Inactiva');
    expect(html).toContain('Ver paradas');
    expect(html).not.toContain('No se encontraron frecuencias');
  });

  it('marca la tabla como ocupada cuando se recarga con datos ya visibles', async () => {
    configurar({ loading: true, filas: [fila()] });

    const { html } = await renderizarVista();

    expect(html).toContain('<table');
    expect(html).not.toContain('Consultando frecuencias...');
  });

  it('no muestra detalle de paradas hasta seleccionar una frecuencia', async () => {
    configurar({ filas: [fila()] });

    const { html } = await renderizarVista();

    expect(html).not.toContain('Cerrar detalle');
    expect(html).not.toContain('Paradas intermedias');
  });

  it('con una frecuencia seleccionada muestra su detalle con la lista de paradas', async () => {
    configurar({
      filas: [fila()],
      seleccionada: fila(),
      paradas: [
        { id: 5, orden: 1, ciudad: 'Latacunga', tiempo: '2 h', minutosDesdeOrigen: 120, permiteVenta: true, costo: '—' },
      ],
    });

    const { html } = await renderizarVista();

    expect(html).toContain('Cerrar detalle');
    expect(html).toContain('Frecuencia FR-001');
    expect(html).toContain('Paradas intermedias');
    expect(html).toContain('Latacunga');
  });

  it('no incluye selectores de buses ni asignaciones operativas', async () => {
    configurar({ filas: [fila()], seleccionada: fila() });

    const { html } = await renderizarVista();

    // Palabra completa: "Buscar" (la búsqueda por tramo) no cuenta.
    expect(html).not.toMatch(/\bbus(es)?\b/i);
  });
});
