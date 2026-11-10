// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SelectorDescuentoPasajero, {
  type PasajeroData,
} from './SelectorDescuentoPasajero.vue';

describe('SelectorDescuentoPasajero.vue', () => {
  const initialPasajero: PasajeroData = {
    cedula: '1801234567',
    nombres: 'Carlos Mendoza',
    categoria: 'GENERAL',
    tieneDiscapacidad: false,
    edad: 30,
  };

  it('renderiza correctamente las categorías y el desglose de tarifa base', () => {
    const wrapper = mount(SelectorDescuentoPasajero, {
      props: {
        modelValue: initialPasajero,
        precioBase: 15.0,
      },
    });

    expect(wrapper.text()).toContain('Categoría del Pasajero y Descuentos');
    expect(wrapper.text()).toContain('General (Adulto)');
    expect(wrapper.text()).toContain('Tercera Edad (65+)');
    expect(wrapper.text()).toContain('Discapacidad / CONADIS');
    expect(wrapper.text()).toContain('Niño / Menor');
    expect(wrapper.text()).toContain('$15.00');
  });

  it('emite actualización con descuento al seleccionar Tercera Edad', async () => {
    const wrapper = mount(SelectorDescuentoPasajero, {
      props: {
        modelValue: initialPasajero,
        precioBase: 15.0,
      },
    });

    const buttons = wrapper.findAll('button');
    const terceraEdadBtn = buttons.find(b => b.text().includes('Tercera Edad'));
    expect(terceraEdadBtn).toBeDefined();

    await terceraEdadBtn!.trigger('click');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({
      categoria: 'TERCERA_EDAD',
      edad: 68,
    });
  });

  it('calcula y muestra -50% cuando la categoría es DISCAPACIDAD', () => {
    const wrapper = mount(SelectorDescuentoPasajero, {
      props: {
        modelValue: {
          ...initialPasajero,
          categoria: 'DISCAPACIDAD',
          tieneDiscapacidad: true,
        },
        precioBase: 15.0,
      },
    });

    expect(wrapper.text()).toContain('-50% APLICADO');
    expect(wrapper.text()).toContain('Descuento Ley (-50%): -$7.50');
    expect(wrapper.text()).toContain('$7.50');
  });
});
