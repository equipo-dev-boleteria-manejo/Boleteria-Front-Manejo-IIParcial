import { describe, expect, it } from 'vitest';
import ModalCrearFrecuencia from './ModalCrearFrecuencia.vue';
import { renderizar } from '../testing/renderizarSsr';

describe('ModalCrearFrecuencia', () => {
  it('cerrado: no renderiza el formulario', async () => {
    const { html, cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: false });

    expect(html).not.toContain('form-crear-frecuencia');
    expect(cuerpo).not.toContain('form-crear-frecuencia');
  });

  it('abierto: muestra los campos del formulario y los 7 días marcados por defecto', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 1 });

    expect(cuerpo).toContain('id="form-crear-frecuencia"');
    for (const etiqueta of ['Ciudad de origen', 'Ciudad de destino', 'Hora de salida', 'Identificador de frecuencia']) {
      expect(cuerpo).toContain(etiqueta);
    }
    expect(cuerpo).toContain('type="time"');
    expect(cuerpo).toContain('Miércoles');
    expect(cuerpo).toContain('Sábado');
    expect(cuerpo.match(/type="checkbox"[^>]*value="/g)).toHaveLength(7);
    expect(cuerpo).toContain('Registrar frecuencia');
    expect(cuerpo).toContain('Cancelar');
  });

  it('no pide la cooperativa cuando el usuario ya pertenece a una', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 4 });

    expect(cuerpo).not.toContain('ID de la cooperativa');
  });

  it('pide la cooperativa cuando el usuario no está asociado a ninguna', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: null });

    expect(cuerpo).toContain('ID de la cooperativa');
  });

  it('estado de error: muestra el mensaje dentro del modal', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, {
      modelValue: true,
      cooperativaId: 1,
      error: 'El identificador FR-1 ya existe para la cooperativa 1',
    });

    expect(cuerpo).toContain('role="alert"');
    expect(cuerpo).toContain('El identificador FR-1 ya existe');
  });

  it('estado de carga: deshabilita los botones del pie', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 1, loading: true });

    expect(cuerpo).toMatch(/<button[^>]*type="submit"[^>]*form="form-crear-frecuencia"[^>]*disabled|<button[^>]*disabled[^>]*form="form-crear-frecuencia"/);
    expect(cuerpo).toContain('animate-spin');
  });
});
