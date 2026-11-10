import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import ValidarQR from './ValidarQR.vue';
import { renderizar } from '../../testing/renderizarSsr';
import { useChoferRuta } from '../../Composables/useChoferRuta';
import { useAuthStore } from '../../Store/authStore';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { EstadoRuta, RolUsuario } from '../../../Domain/Constants/EstadosSistema';

vi.mock('../../Composables/useChoferRuta', () => ({ useChoferRuta: vi.fn() }));
vi.mock('../../Store/authStore', () => ({ useAuthStore: vi.fn() }));

const ID_CHOFER = '00000000-0000-0000-0000-000000000001';

function crearEstadoChofer(opciones: {
  ruta?: Ruta | null;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
} = {}): ReturnType<typeof useChoferRuta> {
  const rutaActual = ref(opciones.ruta ?? null);
  return {
    rutaActual,
    historial: ref([]),
    loading: ref(opciones.loading ?? false),
    error: ref(opciones.error ?? null),
    success: ref(opciones.success ?? null),
    resultado: ref(null),
    pasajeros: ref([]),
    rutaProgramada: computed(() => rutaActual.value?.estado === EstadoRuta.PROGRAMADA),
    rutaEnCurso: computed(() => rutaActual.value?.estado === EstadoRuta.EN_CURSO),
    rutaCompletada: computed(() => rutaActual.value?.estado === EstadoRuta.FINALIZADA),
    rutaCancelada: computed(() => rutaActual.value?.estado === EstadoRuta.CANCELADA),
    minutosDesdeSalida: computed(() => 10),
    requiereObservacionPorTiempo: computed(() => false),
    cargarRutaChofer: vi.fn(),
    iniciarViaje: vi.fn(),
    finalizarViaje: vi.fn(),
    marcarEmergencia: vi.fn(),
    validarQrBoleto: vi.fn(),
    limpiar: vi.fn(),
  } as ReturnType<typeof useChoferRuta>;
}

function asignarSesion(rol: RolUsuario, id = ID_CHOFER) {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id, email: 'chofer@example.com', rol },
    role: rol,
  } as ReturnType<typeof useAuthStore>);
}

describe('ValidarQR View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asignarSesion(RolUsuario.CHOFER);
    vi.mocked(useChoferRuta).mockReturnValue(crearEstadoChofer());
  });

  it('renderiza identidad de sesión y no permite ingresar manualmente el ID de otro chofer', async () => {
    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('Control de Abordaje y Validación de Boletos');
    expect(html).toContain('Conductor:');
    expect(html).toContain('ID de usuario:');
    expect(html).not.toContain('Cédula / ID chofer');
    expect(html).not.toContain('chofer-1');
  });

  it('renderiza estado de carga al consultar la ruta de sesión', async () => {
    vi.mocked(useChoferRuta).mockReturnValue(crearEstadoChofer({ loading: true }));

    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('aria-label="Cargando ruta del chofer"');
    expect(html).toContain('Consultando viaje asignado al conductor...');
    expect(html).not.toContain('Acceso de operación restringido');
  });

  it('renderiza error explícito y estado vacío cuando el chofer no tiene ruta', async () => {
    vi.mocked(useChoferRuta).mockReturnValue(
      crearEstadoChofer({ error: 'No se pudo consultar la ruta.' }),
    );

    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('No se pudo consultar la ruta.');
    expect(html).toContain('No hay ruta activa asignada');
    expect(html).toContain(ID_CHOFER);
    expect(html).not.toContain('Validación Manual de Boleto');
  });

  it('renderiza acciones de abordaje cuando la ruta está asignada al chofer autenticado', async () => {
    const ruta = new Ruta(1, 10, '2026-06-15', EstadoRuta.EN_CURSO);
    ruta.id = 7;
    ruta.choferId = ID_CHOFER;
    vi.mocked(useChoferRuta).mockReturnValue(crearEstadoChofer({ ruta }));

    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('Viaje Operativo #7');
    expect(html).toContain('Validación Manual de Boleto');
    expect(html).toContain('Validar Boleto');
    expect(html).toContain('Reportar Novedad');
  });

  it('oculta ruta y operaciones para usuarios que no sean choferes', async () => {
    asignarSesion(RolUsuario.ADMIN);
    const ruta = new Ruta(1, 10, '2026-06-15', EstadoRuta.EN_CURSO);
    ruta.id = 7;
    ruta.choferId = ID_CHOFER;
    vi.mocked(useChoferRuta).mockReturnValue(crearEstadoChofer({ ruta }));

    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('Acceso de operación restringido');
    expect(html).not.toContain('Viaje Operativo #7');
    expect(html).not.toContain('Validación Manual de Boleto');
  });

  it('no muestra ni permite operar una ruta asignada a otro UUID', async () => {
    const ruta = new Ruta(1, 10, '2026-06-15', EstadoRuta.EN_CURSO);
    ruta.id = 7;
    ruta.choferId = '00000000-0000-0000-0000-000000000002';
    vi.mocked(useChoferRuta).mockReturnValue(crearEstadoChofer({ ruta }));

    const { html } = await renderizar(ValidarQR, {}, { conPinia: true });

    expect(html).toContain('No hay ruta activa asignada');
    expect(html).not.toContain('Viaje Operativo #7');
    expect(html).not.toContain('Validar Boleto');
  });
});
