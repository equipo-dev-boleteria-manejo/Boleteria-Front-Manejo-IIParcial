// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AsientosTarifasView from './AsientosTarifasView.vue';
import * as useSeatTypesModule from '../Composables/useSeatTypes';
import { ref } from 'vue';

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}));

describe('AsientosTarifasView.vue', () => {
  it('renderiza las métricas y el selector interactivo de asientos', () => {
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

    // MetricCards
    expect(wrapper.text()).toContain('Total Asientos');
    expect(wrapper.text()).toContain('Disponibles');
    expect(wrapper.text()).toContain('Ocupados');
    expect(wrapper.text()).toContain('Tarifas Activas');

    // SelectorAsientosBus
    expect(wrapper.text()).toContain('Selección de Asiento');
    expect(wrapper.text()).toContain('Elija la ubicación dentro del mapa interactivo del bus');
  });
});
