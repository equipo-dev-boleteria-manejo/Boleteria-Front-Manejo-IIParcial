import { describe, expect, it } from 'vitest';
import ModalCrearFrecuencia from './ModalCrearFrecuencia.vue';
import { renderizar } from '../testing/renderizarSsr';

describe('ModalCrearFrecuencia', () => {
  it('cerrado: no renderiza el formulario', async () => {
    const { html, cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: false });

    expect(html).not.toContain('form-frecuencia');
    expect(cuerpo).not.toContain('form-frecuencia');
  });

  it('abierto: usa el modal base del sistema con el título y el formulario', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 1 });

    expect(cuerpo).toContain('Registrar nueva frecuencia');
    expect(cuerpo).toContain('max-w-2xl');
    expect(cuerpo).toContain('id="form-frecuencia"');
    for (const etiqueta of [
      'Ciudad de origen',
      'Ciudad de destino',
      'Hora de salida',
      'Identificador de frecuencia',
      'Código ANT',
      'Resolución ANT',
    ]) {
      expect(cuerpo).toContain(etiqueta);
    }
    expect(cuerpo).toContain('type="time"');
  });

  it('muestra los 7 días de operación marcados por defecto y el servicio directo', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 1 });

    expect(cuerpo).toContain('Días de operación');
    expect(cuerpo).toContain('Miércoles');
    expect(cuerpo).toContain('Sábado');
    expect(cuerpo.match(/type="checkbox"[^>]*value="/g)).toHaveLength(7);
    expect(cuerpo).toContain('Servicio directo');
  });

  it('con cooperativa en la sesión: la muestra en una tarjeta informativa y no la pide', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 4 });

    expect(cuerpo).toContain('Cooperativa asignada');
    expect(cuerpo).toContain('Cooperativa N.º 4');
    expect(cuerpo).toContain('Vinculación automática por sesión');
    expect(cuerpo).not.toContain('ID de la cooperativa');
  });

  it('sin cooperativa en la sesión: la pide en el formulario', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: null });

    expect(cuerpo).toContain('ID de la cooperativa');
    expect(cuerpo).not.toContain('Cooperativa asignada');
  });

  it('estado de error: muestra el mensaje dentro del modal con el estilo del sistema', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, {
      modelValue: true,
      cooperativaId: 1,
      error: 'El identificador FR-1 ya existe para la cooperativa 1',
    });

    expect(cuerpo).toContain('role="alert"');
    expect(cuerpo).toContain('El identificador FR-1 ya existe');
  });

  it('pie con las acciones del sistema: cancelar y registrar', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 1 });

    expect(cuerpo).toContain('Cancelar');
    expect(cuerpo).toContain('Registrar frecuencia');
    expect(cuerpo).toMatch(/<button[^>]*form="form-frecuencia"/);
  });

  it('estado de carga: deshabilita los campos y los botones del pie', async () => {
    const { cuerpo } = await renderizar(ModalCrearFrecuencia, { modelValue: true, cooperativaId: 1, loading: true });

    expect(cuerpo).toContain('animate-spin');
    expect(cuerpo).toMatch(/<input[^>]*id="frecuencia-origen"[^>]*disabled|<input[^>]*disabled[^>]*id="frecuencia-origen"/);
    expect(cuerpo).toMatch(/<button(?=[^>]*type="submit")(?=[^>]*\bdisabled\b)[^>]*>/);
  });
});
