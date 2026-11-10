// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEscanerQr, type EscanerCamara } from './useEscanerQr';

interface EscanerFalso extends EscanerCamara {
  emitir: (texto: string) => void;
}

const crearEscanerFalso = (): EscanerFalso => {
  let alLeer: (texto: string) => void = () => undefined;
  return {
    start: vi.fn(async (_camara, _config, callback) => {
      alLeer = callback;
    }),
    stop: vi.fn(async () => undefined),
    clear: vi.fn(),
    emitir: (texto) => alLeer(texto),
  };
};

describe('useEscanerQr', () => {
  let escaner: EscanerFalso;
  let alLeer: (codigo: string) => void;
  let reloj: number;
  let bloqueo: string;

  const crear = () =>
    useEscanerQr({
      idContenedor: 'lector',
      motivoBloqueo: () => bloqueo,
      alLeer: (codigo) => alLeer(codigo),
      crearEscaner: () => escaner,
      ahora: () => reloj,
    });

  beforeEach(() => {
    escaner = crearEscanerFalso();
    alLeer = vi.fn();
    reloj = 1000;
    bloqueo = '';
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  });

  it('no enciende la cámara y explica el motivo cuando hay un bloqueo', async () => {
    bloqueo = 'Primero debes iniciar el viaje para activar el escáner.';
    const { iniciar, camaraActiva, mensajeCamara } = crear();

    await iniciar();

    expect(escaner.start).not.toHaveBeenCalled();
    expect(camaraActiva.value).toBe(false);
    expect(mensajeCamara.value).toBe('Primero debes iniciar el viaje para activar el escáner.');
  });

  it('avisa cuando el navegador no permite acceder a la cámara', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    const { iniciar, mensajeCamara } = crear();

    await iniciar();

    expect(mensajeCamara.value).toContain('El navegador no permite el acceso a la cámara');
    expect(escaner.start).not.toHaveBeenCalled();
  });

  it('enciende la cámara y entrega cada código leído', async () => {
    const { iniciar, camaraActiva } = crear();

    await iniciar();
    escaner.emitir('BOL-1');

    expect(camaraActiva.value).toBe(true);
    expect(escaner.start).toHaveBeenCalledWith(
      { facingMode: 'environment' },
      expect.objectContaining({ fps: 10 }),
      expect.any(Function),
      expect.any(Function),
    );
    expect(alLeer).toHaveBeenCalledWith('BOL-1');
  });

  it('ignora el mismo código si vuelve a leerse enseguida, pero lo acepta pasada la ventana', async () => {
    const { iniciar } = crear();
    await iniciar();

    escaner.emitir('BOL-1');
    reloj += 500;
    escaner.emitir('BOL-1');
    reloj += 3000;
    escaner.emitir('BOL-1');

    expect(alLeer).toHaveBeenCalledTimes(2);
  });

  it('un código distinto se procesa de inmediato', async () => {
    const { iniciar } = crear();
    await iniciar();

    escaner.emitir('BOL-1');
    escaner.emitir('BOL-2');

    expect(alLeer).toHaveBeenCalledTimes(2);
  });

  it('muestra un mensaje claro si la cámara falla al iniciar', async () => {
    vi.mocked(escaner.start).mockRejectedValue(new Error('NotAllowedError'));
    const { iniciar, camaraActiva, mensajeCamara } = crear();

    await iniciar();

    expect(camaraActiva.value).toBe(false);
    expect(mensajeCamara.value).toBe('No se pudo iniciar la cámara. Verifica los permisos.');
  });

  it('detener() apaga la cámara y libera el lector; alternar() enciende y apaga', async () => {
    const { iniciar, detener, alternar, camaraActiva } = crear();

    await iniciar();
    await detener();

    expect(escaner.stop).toHaveBeenCalledTimes(1);
    expect(escaner.clear).toHaveBeenCalledTimes(1);
    expect(camaraActiva.value).toBe(false);

    await alternar();
    expect(camaraActiva.value).toBe(true);
    await alternar();
    expect(camaraActiva.value).toBe(false);
  });

  it('detener() sin cámara encendida no toca el lector', async () => {
    const { detener } = crear();

    await detener();

    expect(escaner.stop).not.toHaveBeenCalled();
  });

  it('si el lector falla al detenerse, igualmente queda marcado como apagado', async () => {
    vi.mocked(escaner.stop).mockRejectedValue(new Error('ya detenida'));
    const { iniciar, detener, camaraActiva } = crear();
    await iniciar();

    await detener();

    expect(camaraActiva.value).toBe(false);
  });
});
