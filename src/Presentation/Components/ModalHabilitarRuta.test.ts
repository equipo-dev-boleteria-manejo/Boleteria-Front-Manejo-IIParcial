// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalHabilitarRuta from './ModalHabilitarRuta.vue';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';

const HOY = new Date();
const dosDigitos = (n: number) => String(n).padStart(2, '0');
const hoyISO = `${HOY.getFullYear()}-${dosDigitos(HOY.getMonth() + 1)}-${dosDigitos(HOY.getDate())}`;

const frecuencia = new Frecuencia(1, 'Quito', 'Guayaquil', '08:00', 'FR-01', false, ['Lunes', 'Martes']);
frecuencia.id = 1;
frecuencia.establecerParadas([new ParadaIntermedia('Santo Domingo', 1, 150)]);

const bus = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
bus.id = 10;

const choferes = [{ id: 'uuid-chofer-1', nombreCompleto: 'Ana Pérez' }];

const montar = (props: Record<string, unknown> = {}) =>
  mount(ModalHabilitarRuta, {
    props: {
      modelValue: true,
      frecuencias: [frecuencia],
      buses: [bus],
      choferes,
      esDiaOperativo: () => true,
      ...props,
    },
    global: { stubs: { teleport: true } },
  });

describe('ModalHabilitarRuta', () => {
  it('cerrado: no renderiza el formulario', () => {
    const wrapper = montar({ modelValue: false });

    expect(wrapper.find('#form-habilitar-ruta').exists()).toBe(false);
  });

  it('abierto: muestra los campos, con la fecha de hoy y sin errores', () => {
    const wrapper = montar();

    expect(wrapper.text()).toContain('Habilitar y programar ruta diaria');
    expect(wrapper.text()).toContain('Frecuencia / Horario');
    expect(wrapper.text()).toContain('Unidad / Bus');
    expect(wrapper.text()).toContain('Quito → Guayaquil (08:00)');
    expect(wrapper.text()).toContain('Bus #25 (PBA-1234)');
    expect((wrapper.find('#habilitar-fecha').element as HTMLInputElement).value).toBe(hoyISO);
    expect(wrapper.text()).not.toContain('Selecciona una frecuencia');
  });

  it('el selector de chofer muestra el nombre y no su UUID', () => {
    const wrapper = montar();

    expect(wrapper.find('#habilitar-chofer').text()).toContain('Ana Pérez');
    expect(wrapper.text()).not.toContain('uuid-chofer-1');
  });

  it('formulario vacío: al enviar marca frecuencia y unidad en rojo y no emite nada', async () => {
    const wrapper = montar();

    await wrapper.find('#form-habilitar-ruta').trigger('submit');

    expect(wrapper.emitted('habilitar')).toBeUndefined();
    expect(wrapper.text()).toContain('Selecciona una frecuencia');
    expect(wrapper.text()).toContain('Selecciona una unidad');
    expect(wrapper.find('#habilitar-frecuencia').attributes('aria-invalid')).toBe('true');
  });

  it('valida la fecha en tiempo real y bloquea el botón mientras haya errores', async () => {
    const wrapper = montar();

    await wrapper.find('#habilitar-fecha').setValue('2020-01-01');

    expect(wrapper.text()).toContain('La fecha no puede ser anterior a hoy');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    await wrapper.find('#habilitar-fecha').setValue(hoyISO);

    expect(wrapper.text()).not.toContain('La fecha no puede ser anterior a hoy');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });

  it('al elegir una frecuencia con paradas propone la modalidad y el tiempo de viaje', async () => {
    const wrapper = montar();

    await wrapper.find('#habilitar-frecuencia').setValue(1);

    expect((wrapper.find('#habilitar-directo').element as HTMLInputElement).checked).toBe(false);
    expect((wrapper.find('#habilitar-tiempo').element as HTMLInputElement).value).toBe('150');
  });

  it('avisa junto a la frecuencia cuando no opera en la fecha elegida', async () => {
    const wrapper = montar({ esDiaOperativo: () => false });

    await wrapper.find('#habilitar-frecuencia').setValue(1);

    expect(wrapper.text()).toContain('La frecuencia seleccionada no opera en la fecha elegida');
  });

  it('con datos válidos emite el payload de habilitación', async () => {
    const wrapper = montar();

    await wrapper.find('#habilitar-frecuencia').setValue(1);
    await wrapper.find('#habilitar-bus').setValue(10);
    await wrapper.find('#habilitar-chofer').setValue('uuid-chofer-1');
    await wrapper.find('#habilitar-observacion').setValue('Salida especial');
    await wrapper.find('#form-habilitar-ruta').trigger('submit');

    expect(wrapper.emitted('habilitar')).toHaveLength(1);
    expect(wrapper.emitted('habilitar')?.[0][0]).toEqual({
      frecuenciaId: 1,
      busId: 10,
      fecha: hoyISO,
      choferId: 'uuid-chofer-1',
      esDirecta: false,
      horaSalida: '08:00',
      observacionChofer: 'Salida especial',
      tiempoViajeMinutos: 150,
    });
  });

  it('al reabrirse el formulario vuelve limpio', async () => {
    const wrapper = montar();
    await wrapper.find('#habilitar-bus').setValue(10);
    await wrapper.find('#form-habilitar-ruta').trigger('submit');

    await wrapper.setProps({ modelValue: false });
    await wrapper.setProps({ modelValue: true });

    expect((wrapper.find('#habilitar-bus').element as HTMLSelectElement).value).toBe('');
    expect(wrapper.text()).not.toContain('Selecciona una frecuencia');
  });

  it('estado de error: muestra el mensaje del servidor dentro del modal', () => {
    const wrapper = montar({ error: 'La unidad ya tiene un viaje asignado en este horario.' });

    expect(wrapper.find('[role="alert"]').text()).toContain('La unidad ya tiene un viaje asignado en este horario.');
  });

  it('estado de carga: deshabilita los campos y muestra el spinner', () => {
    const wrapper = montar({ loading: true });

    expect(wrapper.find('.animate-spin').exists()).toBe(true);
    expect(wrapper.find('#habilitar-frecuencia').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#habilitar-bus').attributes('disabled')).toBeDefined();
  });

  it('sin frecuencias activas explica qué hacer y no permite enviar', () => {
    const wrapper = montar({ frecuencias: [] });

    expect(wrapper.text()).toContain('No se encontraron frecuencias activas');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('sin buses activos lo indica junto al selector', () => {
    const wrapper = montar({ buses: [] });

    expect(wrapper.text()).toContain('No hay buses activos registrados.');
  });

  describe('servicio directo', () => {
    const directa = new Frecuencia(1, 'Quito', 'Ambato', '07:00', 'FR-02', true, ['Lunes', 'Martes']);
    directa.id = 2;

    const casilla = (wrapper: ReturnType<typeof montar>) => wrapper.find('#habilitar-directo');

    it('con una frecuencia directa la casilla queda marcada y bloqueada, con su explicación', async () => {
      const wrapper = montar({ frecuencias: [frecuencia, directa] });

      await wrapper.find('#habilitar-frecuencia').setValue(2);

      expect((casilla(wrapper).element as HTMLInputElement).checked).toBe(true);
      expect(casilla(wrapper).attributes('disabled')).toBeDefined();
      expect(wrapper.text()).toContain('Esta frecuencia es directa: no tiene paradas intermedias.');
    });

    it('con una frecuencia con paradas se puede marcar para que ese día salga directa', async () => {
      const wrapper = montar({ frecuencias: [frecuencia, directa] });

      await wrapper.find('#habilitar-frecuencia').setValue(1);
      expect(casilla(wrapper).attributes('disabled')).toBeUndefined();
      expect(wrapper.text()).toContain('ese día, la ruta salga sin detenerse');

      await casilla(wrapper).setValue(true);
      await wrapper.find('#habilitar-bus').setValue(10);
      await wrapper.find('#form-habilitar-ruta').trigger('submit');

      expect(wrapper.emitted('habilitar')?.[0][0]).toMatchObject({ frecuenciaId: 1, esDirecta: true });
    });

    it('sin frecuencia elegida no muestra ninguna explicación', () => {
      const wrapper = montar();

      expect(wrapper.text()).not.toContain('Esta frecuencia es directa');
      expect(wrapper.text()).not.toContain('ese día, la ruta salga');
    });
  });
});
