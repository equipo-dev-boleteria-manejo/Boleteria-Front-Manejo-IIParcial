// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AsientosTarifasView from './AsientosTarifasView.vue';
import * as useSeatTypesModule from '../Composables/useSeatTypes';
import { ref } from 'vue';

describe('AsientosTarifasView.vue', () => {
  it('renderiza las métricas de la plantilla de flota y el selector interactivo para el administrador', () => {
    setActivePinia(createPinia());

    vi.spyOn(useSeatTypesModule, 'useSeatTypes').mockReturnValue({
      seatTypes: ref([
        { id: 1, nombre: 'VIP', precioBase: 15, descripcion: '', activo: true },
        { id: 2, nombre: 'Normal', precioBase: 10, descripcion: '', activo: true },
      ]),
      loading: ref(false),
      error: ref(null),
      tieneTiposAsiento: ref(true),
      cargarTiposAsiento: vi.fn(),
      calcularTarifa: vi.fn(),
      validarAsignacion: vi.fn(),
    });

    const wrapper = mount(AsientosTarifasView);

    // MetricCards del Administrador
    expect(wrapper.text()).toContain('Capacidad Total');
    expect(wrapper.text()).toContain('Piso 1 (VIP)');
    expect(wrapper.text()).toContain('Piso 2 (Standard)');
    expect(wrapper.text()).toContain('Tarifas Reguladas');

    // SelectorAsientosBus
    expect(wrapper.text()).toContain('Selección de Asiento');
    expect(wrapper.text()).toContain('Elija la ubicación dentro del mapa interactivo del bus');

    // Especificación de Tarifas
    expect(wrapper.text()).toContain('Especificación de Tarifas Base de la Cooperativa');
    expect(wrapper.text()).toContain('Descuentos de Ley Obligatorios');
  });
});
