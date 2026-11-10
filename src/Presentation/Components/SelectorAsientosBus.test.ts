// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SelectorAsientosBus from './SelectorAsientosBus.vue';
import * as useSeatTypesModule from '../Composables/useSeatTypes';

describe('SelectorAsientosBus.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el skeleton de carga cuando loading es true', () => {
    vi.spyOn(useSeatTypesModule, 'useSeatTypes').mockReturnValue({
      seatTypes: ref([]),
      loading: ref(true),
      error: ref(null),
      tieneTiposAsiento: ref(false),
      cargarTiposAsiento: vi.fn(),
      calcularTarifa: vi.fn(),
      validarAsignacion: vi.fn(),
    });

    const wrapper = mount(SelectorAsientosBus);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Cargando tipos de asiento y tarifas...');
  });

  it('muestra el estado de error y botón de reintento cuando ocurre un fallo al cargar', async () => {
    const mockCargar = vi.fn();
    vi.spyOn(useSeatTypesModule, 'useSeatTypes').mockReturnValue({
      seatTypes: ref([]),
      loading: ref(false),
      error: ref('Fallo de conexión al catálogo'),
      tieneTiposAsiento: ref(false),
      cargarTiposAsiento: mockCargar,
      calcularTarifa: vi.fn(),
      validarAsignacion: vi.fn(),
    });

    const wrapper = mount(SelectorAsientosBus);
    expect(wrapper.find('[role="alert"]').text()).toContain('Fallo de conexión al catálogo');

    const reintentarBtn = wrapper.find('[role="alert"] button');
    expect(reintentarBtn.text()).toContain('Reintentar');
    await reintentarBtn.trigger('click');
    expect(mockCargar).toHaveBeenCalledTimes(2);
  });

  it('muestra estado vacío si no existen tipos de asiento configurados', () => {
    vi.spyOn(useSeatTypesModule, 'useSeatTypes').mockReturnValue({
      seatTypes: ref([]),
      loading: ref(false),
      error: ref(null),
      tieneTiposAsiento: ref(false),
      cargarTiposAsiento: vi.fn(),
      calcularTarifa: vi.fn(),
      validarAsignacion: vi.fn(),
    });

    const wrapper = mount(SelectorAsientosBus);
    expect(wrapper.text()).toContain('No hay tarifas configuradas');
  });

  it('emite el asiento seleccionado al hacer click en un asiento disponible', async () => {
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

    const wrapper = mount(SelectorAsientosBus, {
      props: {
        asientosOcupadosIds: ['P1-2'],
      },
    });

    const buttons = wrapper.findAll('button');
    const firstSeat = buttons.find((b) => b.text().includes('Nº 1'));
    expect(firstSeat).toBeDefined();

    await firstSeat?.trigger('click');
    expect(wrapper.emitted('seleccionar-asiento')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();

    const selectedPayload = (wrapper.emitted('seleccionar-asiento')?.[0] as any)?.[0];
    expect(selectedPayload.numero).toBe('1');
    expect(selectedPayload.precioBase).toBe(15);
  });

  it('no permite seleccionar un asiento ocupado ni emite eventos', async () => {
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

    const wrapper = mount(SelectorAsientosBus, {
      props: {
        asientosOcupadosIds: ['P1-2'],
      },
    });

    const buttons = wrapper.findAll('button');
    const occupiedSeat = buttons.find((b) => b.text().includes('Nº 2'));
    expect(occupiedSeat?.attributes('disabled')).toBeDefined();

    await occupiedSeat?.trigger('click');
    expect(wrapper.emitted('seleccionar-asiento')).toBeUndefined();
  });

  it('permite cambiar entre piso 1 y piso 2', async () => {
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

    const wrapper = mount(SelectorAsientosBus);
    expect(wrapper.text()).toContain('Piso 1 (VIP)');
    expect(wrapper.text()).toContain('Piso 2 (Standard)');

    // Inicialmente piso 1 (12 asientos VIP)
    expect(wrapper.text()).toContain('Nº 1');
    expect(wrapper.text()).toContain('Nº 12');

    // Cambiar a piso 2
    const piso2Btn = wrapper.findAll('button').find((b) => b.text().includes('Piso 2'));
    await piso2Btn?.trigger('click');

    // Ahora muestra asientos del piso 2 (13 al 36)
    expect(wrapper.text()).toContain('Nº 13');
    expect(wrapper.text()).toContain('Nº 36');
  });
});
