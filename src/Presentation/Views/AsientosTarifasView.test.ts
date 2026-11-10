// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AsientosTarifasView from './AsientosTarifasView.vue';
import * as useSeatTypesModule from '../Composables/useSeatTypes';
import { ref } from 'vue';

describe('AsientosTarifasView.vue', () => {
  it('renderiza las tarjetas métricas y el card base con el selector', () => {
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

    // CardBase title & subtitle
    expect(wrapper.text()).toContain('Gestión de Asientos y Tarifas');
    expect(wrapper.text()).toContain('Consulta las tarifas y selecciona un asiento disponible');
  });
});
