// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import StripePaymentForm from './StripePaymentForm.vue';

// Mock de @stripe/stripe-js
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}));

describe('StripePaymentForm.vue', () => {
  it('renderiza el formulario de pago con tarjeta con el monto indicado', () => {
    const wrapper = mount(StripePaymentForm, {
      props: {
        amount: 15.0,
      },
    });

    expect(wrapper.text()).toContain('Pago con Tarjeta de Crédito / Débito');
    expect(wrapper.text()).toContain('$15.00');
    expect(wrapper.find('button[type="submit"]').text()).toContain('Pagar $15.00');
  });

  it('emite evento de éxito al enviar el formulario en modo simulación', async () => {
    vi.useFakeTimers();
    const wrapper = mount(StripePaymentForm, {
      props: {
        amount: 7.5,
      },
    });

    await wrapper.find('form').trigger('submit');
    vi.runAllTimers();

    const emitted = wrapper.emitted('success');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({
      status: 'succeeded',
      amount: 750,
      simulated: true,
    });
    vi.useRealTimers();
  });
});
