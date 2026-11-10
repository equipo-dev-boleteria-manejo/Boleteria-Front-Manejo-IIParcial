// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalPagoBoleto from './ModalPagoBoleto.vue';

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}));

describe('ModalPagoBoleto.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renderiza resumen de asiento, tarifa base y campos de pasajero dentro del modal', () => {
    mount(ModalPagoBoleto, {
      props: {
        modelValue: true,
        asientoNumero: 4,
        asientoTipo: 'VIP',
        piso: 1,
        precioBase: 15.0,
      },
      attachTo: document.body,
    });

    expect(document.body.textContent).toContain('Reserva y Pago de Asiento');
    expect(document.body.textContent).toContain('Nº 4 · Piso 1 (VIP)');
    expect(document.body.textContent).toContain('Categoría del Pasajero y Descuentos');
    expect(document.body.textContent).toContain('$15.00');
  });

  it('permite cambiar a transferencia bancaria y emitir confirmación en validación', async () => {
    vi.useFakeTimers();
    const wrapper = mount(ModalPagoBoleto, {
      props: {
        modelValue: true,
        asientoNumero: 4,
        asientoTipo: 'VIP',
        piso: 1,
        precioBase: 15.0,
      },
      attachTo: document.body,
    });

    // Cambiar a pestaña transferencia en document.body
    const buttons = Array.from(document.body.querySelectorAll('button'));
    const transferBtn = buttons.find(b => b.textContent?.includes('Transferencia Bancaria'));
    expect(transferBtn).toBeDefined();
    transferBtn!.click();
    await wrapper.vm.$nextTick();

    expect(document.body.textContent).toContain('Datos para la Transferencia Bancaria:');
    expect(document.body.textContent).toContain('Banco Pichincha');

    // Ingresar referencia
    const inputRef = document.body.querySelector('input[placeholder="Ej: 987654321"]') as HTMLInputElement;
    expect(inputRef).not.toBeNull();
    inputRef.value = 'TR-998877';
    inputRef.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();

    // Confirmar transferencia
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Registrar Transferencia')
    );
    expect(submitBtn).toBeDefined();
    submitBtn!.click();

    vi.runAllTimers();

    const emitted = wrapper.emitted('confirmado');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({
      metodoPago: 'Transferencia',
      referencia: 'TR-998877',
      estado: 'EN_VALIDACION',
    });
    vi.useRealTimers();
  });
});
