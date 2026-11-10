// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ValidarQR from './ValidarQR.vue';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { EstadoRuta, RolUsuario } from '../../../Domain/Constants/EstadosSistema';

const ID_CHOFER = '00000000-0000-0000-0000-000000000001';

const mocks = vi.hoisted(() => ({
  chofer: {} as Record<string, unknown>,
  auth: {} as Record<string, unknown>,
  escaner: {
    opciones: null as null | { motivoBloqueo: () => string; alLeer: (codigo: string) => Promise<void> | void },
    alternar: vi.fn(),
    detener: vi.fn(),
  },
  feedback: {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock('../../Composables/useChoferRuta', () => ({ useChoferRuta: () => mocks.chofer }));
vi.mock('../../Store/authStore', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('../../Composables/useFeedback', () => ({ useFeedback: () => mocks.feedback }));
vi.mock('../../Composables/useEscanerQr', async () => {
  const { ref: crearRef } = await import('vue');
  return {
    useEscanerQr: (opciones: typeof mocks.escaner.opciones) => {
      mocks.escaner.opciones = opciones;
      return {
        camaraActiva: crearRef(false),
        mensajeCamara: crearRef(''),
        alternar: mocks.escaner.alternar,
        detener: mocks.escaner.detener,
        iniciar: vi.fn(),
      };
    },
  };
});

const crearRuta = (estado: EstadoRuta, choferId: string = ID_CHOFER): Ruta => {
  const ruta = new Ruta(1, 10, '2026-06-15', estado);
  ruta.id = 7;
  ruta.choferId = choferId;
  ruta.horaSalida = '08:00';
  return ruta;
};

interface Opciones {
  ruta?: Ruta | null;
  loading?: boolean;
  error?: string | null;
  requiereObservacion?: boolean;
}

const ok = (mensaje = 'listo') => ({ ok: true, mensaje });
const falla = (mensaje: string) => ({ ok: false, mensaje });

function configurar({ ruta = null, loading = false, error = null, requiereObservacion = false }: Opciones = {}) {
  const rutaActual = ref(ruta);
  mocks.chofer = {
    rutaActual,
    historial: ref([{ codigo: 'BOL-1', hora: '08:10', resultado: 'Validado' }]),
    loading: ref(loading),
    error: ref(error),
    rutaProgramada: computed(() => rutaActual.value?.estado === EstadoRuta.PROGRAMADA),
    rutaEnCurso: computed(() => rutaActual.value?.estado === EstadoRuta.EN_CURSO),
    minutosDesdeSalida: computed(() => 10),
    requiereObservacionPorTiempo: computed(() => requiereObservacion),
    cargarRutaChofer: vi.fn().mockResolvedValue(undefined),
    iniciarViaje: vi.fn().mockResolvedValue(ok()),
    finalizarViaje: vi.fn().mockResolvedValue(ok()),
    marcarEmergencia: vi.fn().mockResolvedValue(ok()),
    validarQrBoleto: vi.fn().mockResolvedValue(ok('Boleto validado')),
    limpiar: vi.fn(),
  };
}

function asignarSesion(rol: RolUsuario = RolUsuario.CHOFER, id = ID_CHOFER) {
  mocks.auth = {
    user: { id, email: 'ana@example.com', nombre: 'Ana Pérez', rol },
    role: rol,
  };
}

async function montar() {
  const wrapper = mount(ValidarQR, { global: { stubs: { teleport: true } } });
  await flushPromises();
  return wrapper;
}

const fn = (nombre: string) => mocks.chofer[nombre] as ReturnType<typeof vi.fn>;
const boton = (wrapper: Awaited<ReturnType<typeof montar>>, texto: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(texto));

describe('ValidarQR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.escaner.opciones = null;
    asignarSesion();
    configurar();
  });

  describe('estados y acceso', () => {
    it('muestra la identidad de la sesión (nombre y correo) y no permite elegir a otro chofer', async () => {
      const wrapper = await montar();

      expect(wrapper.text()).toContain('Conductor: Ana Pérez');
      expect(wrapper.text()).toContain('ana@example.com');
      expect(wrapper.text()).not.toContain('Cédula / ID chofer');
      expect(wrapper.text()).not.toContain('Control de Abordaje y Validación de Boletos');
    });

    it('consulta la ruta del chofer autenticado al montar', async () => {
      await montar();

      expect(fn('cargarRutaChofer')).toHaveBeenCalledWith(ID_CHOFER);
    });

    it('estado cargando: muestra el esqueleto accesible', async () => {
      configurar({ loading: true });
      const wrapper = await montar();

      expect(wrapper.find('[aria-label="Cargando ruta del chofer"]').exists()).toBe(true);
      expect(wrapper.text()).not.toContain('Acceso de operación restringido');
    });

    it('error al consultar sin ruta: muestra el mensaje con reintento', async () => {
      configurar({ error: 'No se pudo consultar la ruta.' });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('No pudimos consultar tu viaje');
      expect(wrapper.text()).toContain('No se pudo consultar la ruta.');
      fn('cargarRutaChofer').mockClear();
      await boton(wrapper, 'Reintentar')?.trigger('click');
      expect(fn('cargarRutaChofer')).toHaveBeenCalledWith(ID_CHOFER);
    });

    it('sin ruta asignada: lo explica con el nombre del conductor y sin mostrar su UUID', async () => {
      const wrapper = await montar();

      expect(wrapper.text()).toContain('No hay ruta activa asignada');
      expect(wrapper.text()).toContain('Ana Pérez');
      expect(wrapper.text()).not.toContain(ID_CHOFER);
      expect(wrapper.text()).not.toContain('Validación manual de boleto');
    });

    it('un usuario que no es chofer ve el acceso restringido y no puede operar', async () => {
      asignarSesion(RolUsuario.ADMIN);
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('Acceso de operación restringido');
      expect(wrapper.text()).not.toContain('Viaje operativo #7');
      expect(fn('cargarRutaChofer')).not.toHaveBeenCalled();
      expect(fn('limpiar')).toHaveBeenCalled();
    });

    it('no muestra ni permite operar una ruta asignada a otro conductor', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO, '00000000-0000-0000-0000-000000000002') });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('No hay ruta activa asignada');
      expect(wrapper.text()).not.toContain('Viaje operativo #7');
      expect(wrapper.text()).not.toContain('Validar boleto');
    });

    it('con la ruta del chofer en curso muestra el viaje, el estado legible y las acciones de abordaje', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      const wrapper = await montar();

      expect(wrapper.text()).toContain('Viaje operativo #7');
      expect(wrapper.text()).toContain('En curso');
      expect(wrapper.text()).not.toContain('EnCurso');
      expect(wrapper.text()).toContain('Validar boleto');
      expect(wrapper.text()).toContain('Reportar novedad');
      expect(wrapper.text()).toContain('BOL-1');
    });
  });

  describe('operación del viaje', () => {
    it('iniciar viaje confirma, inicia y avisa con toast; un fallo muestra el toast de error', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.PROGRAMADA) });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await boton(wrapper, 'Iniciar viaje')?.trigger('click');
      await flushPromises();
      expect(fn('iniciarViaje')).toHaveBeenCalled();
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El viaje comenzó. Ya puedes escanear boletos.');

      fn('iniciarViaje').mockResolvedValue(falla('La ruta no puede iniciarse.'));
      await boton(wrapper, 'Iniciar viaje')?.trigger('click');
      await flushPromises();
      expect(mocks.feedback.showError).toHaveBeenCalledWith('La ruta no puede iniciarse.');
    });

    it('si se cancela la confirmación no inicia el viaje', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.PROGRAMADA) });
      mocks.feedback.confirm.mockResolvedValue(false);
      const wrapper = await montar();

      await boton(wrapper, 'Iniciar viaje')?.trigger('click');
      await flushPromises();

      expect(fn('iniciarViaje')).not.toHaveBeenCalled();
    });

    it('finalizar viaje confirma, apaga la cámara y notifica', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      mocks.feedback.confirm.mockResolvedValue(true);
      const wrapper = await montar();

      await boton(wrapper, 'Finalizar viaje')?.trigger('click');
      await flushPromises();

      expect(mocks.escaner.detener).toHaveBeenCalled();
      expect(fn('finalizarViaje')).toHaveBeenCalledWith();
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El viaje finalizó correctamente.');
    });

    it('si superó el tiempo estimado exige una observación válida antes de finalizar', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO), requiereObservacion: true });
      const wrapper = await montar();
      await boton(wrapper, 'Finalizar viaje')?.trigger('click');

      await wrapper.find('#form-finalizar-observacion').trigger('submit');
      expect(fn('finalizarViaje')).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('La observación es obligatoria');

      await wrapper.find('#obs-finalizar').setValue('ok');
      expect(wrapper.text()).toContain('al menos 5 caracteres');

      await wrapper.find('#obs-finalizar').setValue('Retraso por tráfico en la vía');
      await wrapper.find('#form-finalizar-observacion').trigger('submit');
      await flushPromises();

      expect(fn('finalizarViaje')).toHaveBeenCalledWith('Retraso por tráfico en la vía');
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('El viaje finalizó con la observación registrada.');
    });

    it('reportar novedad exige el detalle y luego avisa con advertencia', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      const wrapper = await montar();
      await boton(wrapper, 'Reportar novedad')?.trigger('click');

      await wrapper.find('#form-emergencia').trigger('submit');
      expect(fn('marcarEmergencia')).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('La observación es obligatoria');

      await wrapper.find('#obs-emergencia').setValue('Falla mecánica en el km 45');
      await wrapper.find('#form-emergencia').trigger('submit');
      await flushPromises();

      expect(fn('marcarEmergencia')).toHaveBeenCalledWith('Falla mecánica en el km 45');
      expect(mocks.feedback.showWarning).toHaveBeenCalledWith('Se registró la novedad y se notificó a la administración.');
    });
  });

  describe('validación de boletos', () => {
    beforeEach(() => configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) }));

    it('código manual vacío: marca el campo en rojo y no valida nada', async () => {
      const wrapper = await montar();

      await wrapper.find('form[novalidate]').trigger('submit');

      expect(wrapper.text()).toContain('El código del boleto es obligatorio');
      expect(fn('validarQrBoleto')).not.toHaveBeenCalled();
    });

    it('rechaza en tiempo real un código con espacios y bloquea el botón', async () => {
      const wrapper = await montar();

      await wrapper.find('#input-codigo-boleto').setValue('BOL 2026');

      expect(wrapper.text()).toContain('El código no puede contener espacios');
      expect(boton(wrapper, 'Validar boleto')?.attributes('disabled')).toBeDefined();
    });

    it('un código válido se valida, avisa con toast de éxito y limpia el campo (sin banner de éxito)', async () => {
      const wrapper = await montar();

      await wrapper.find('#input-codigo-boleto').setValue('BOL-2026-000123');
      await wrapper.find('form[novalidate]').trigger('submit');
      await flushPromises();

      expect(fn('validarQrBoleto')).toHaveBeenCalledWith('BOL-2026-000123');
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Boleto validado');
      expect((wrapper.find('#input-codigo-boleto').element as HTMLInputElement).value).toBe('');
      expect(wrapper.text()).not.toContain('¡Boleto Validado Exitosamente!');
    });

    it('si el boleto es rechazado muestra el motivo en un toast de error', async () => {
      fn('validarQrBoleto').mockResolvedValue(falla('El boleto ya fue utilizado.'));
      const wrapper = await montar();

      await wrapper.find('#input-codigo-boleto').setValue('BOL-9');
      await wrapper.find('form[novalidate]').trigger('submit');
      await flushPromises();

      expect(mocks.feedback.showError).toHaveBeenCalledWith('El boleto ya fue utilizado.');
      expect(mocks.feedback.showSuccess).not.toHaveBeenCalled();
    });
  });

  describe('escáner de cámara', () => {
    it('el botón de la cámara se bloquea hasta que el viaje esté en curso y alterna la cámara', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.PROGRAMADA) });
      const programada = await montar();
      expect(boton(programada, 'Activar cámara')?.attributes('disabled')).toBeDefined();

      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      const enCurso = await montar();
      await boton(enCurso, 'Activar cámara')?.trigger('click');
      expect(mocks.escaner.alternar).toHaveBeenCalled();
    });

    it('explica por qué no se puede escanear según el estado del viaje y la sesión', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.PROGRAMADA) });
      await montar();
      expect(mocks.escaner.opciones?.motivoBloqueo()).toBe('Primero debes iniciar el viaje para activar el escáner.');

      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      await montar();
      expect(mocks.escaner.opciones?.motivoBloqueo()).toBe('');

      asignarSesion(RolUsuario.ADMIN);
      await montar();
      expect(mocks.escaner.opciones?.motivoBloqueo()).toBe('Solo el chofer asignado puede validar boletos.');
    });

    it('un código leído por la cámara se valida como si fuera manual', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      await montar();

      await mocks.escaner.opciones?.alLeer('{"codigo":"BOL-77"}');

      expect(fn('validarQrBoleto')).toHaveBeenCalledWith('BOL-77');
      expect(mocks.feedback.showSuccess).toHaveBeenCalledWith('Boleto validado');
    });

    it('una lectura vacía avisa y no valida', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      await montar();

      await mocks.escaner.opciones?.alLeer('   ');

      expect(fn('validarQrBoleto')).not.toHaveBeenCalled();
      expect(mocks.feedback.showWarning).toHaveBeenCalled();
    });

    it('apaga la cámara al desmontar la vista', async () => {
      configurar({ ruta: crearRuta(EstadoRuta.EN_CURSO) });
      const wrapper = await montar();

      wrapper.unmount();

      expect(mocks.escaner.detener).toHaveBeenCalled();
    });
  });
});
