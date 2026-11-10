/**
 * useEscanerQr.ts - Control de la cámara y lectura continua de códigos QR / de barras
 *
 * Headless: encapsula html5-qrcode (acceso al hardware, ciclo de vida y anti-lecturas duplicadas) para que
 * la vista solo muestre el contenedor del video y el estado. El escáner se inyecta para poder probarlo.
 */
import { nextTick, ref } from 'vue';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { mensajeErrorParaUsuario } from '../Utils/errorMessage';

/** Lo mínimo que el composable necesita del lector de cámara. */
export interface EscanerCamara {
  start(
    camara: { facingMode: string },
    config: Record<string, unknown>,
    alLeer: (texto: string) => void,
    alFallar: (mensaje: string) => void,
  ): Promise<unknown>;
  stop(): Promise<unknown>;
  clear(): void | Promise<unknown>;
}

export type CrearEscaner = (idContenedor: string) => EscanerCamara;

const crearEscanerReal: CrearEscaner = (idContenedor) =>
  new Html5Qrcode(idContenedor) as unknown as EscanerCamara;

const CONFIG_ESCANER = {
  fps: 10,
  qrbox: { width: 240, height: 240 },
  aspectRatio: 1.0,
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
  ],
};

/** Mientras el mismo código siga frente a la cámara no se vuelve a procesar. */
const VENTANA_ANTIDUPLICADOS_MS = 2500;

export interface OpcionesEscanerQr {
  /** Id del elemento HTML donde html5-qrcode dibuja el video. */
  idContenedor: string;
  /** Texto del motivo por el que no se puede escanear ahora, o cadena vacía si se puede. */
  motivoBloqueo: () => string;
  alLeer: (codigo: string) => Promise<void> | void;
  crearEscaner?: CrearEscaner;
  ahora?: () => number;
}

export function useEscanerQr(opciones: OpcionesEscanerQr) {
  const crearEscaner = opciones.crearEscaner ?? crearEscanerReal;
  const ahora = opciones.ahora ?? (() => Date.now());

  const camaraActiva = ref(false);
  const mensajeCamara = ref('');

  let escaner: EscanerCamara | null = null;
  let ultimoCodigo = '';
  let ultimaLectura = 0;

  async function procesarLectura(texto: string): Promise<void> {
    const instante = ahora();
    if (texto === ultimoCodigo && instante - ultimaLectura < VENTANA_ANTIDUPLICADOS_MS) return;

    ultimoCodigo = texto;
    ultimaLectura = instante;
    await opciones.alLeer(texto);
  }

  async function iniciar(): Promise<void> {
    mensajeCamara.value = '';

    const bloqueo = opciones.motivoBloqueo();
    if (bloqueo) {
      mensajeCamara.value = bloqueo;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      mensajeCamara.value = 'El navegador no permite el acceso a la cámara. Usa la validación manual.';
      return;
    }

    try {
      // El contenedor del video debe existir en el DOM antes de crear el lector.
      await nextTick();
      escaner ??= crearEscaner(opciones.idContenedor);

      await escaner.start(
        { facingMode: 'environment' },
        CONFIG_ESCANER,
        (texto) => {
          void procesarLectura(texto);
        },
        () => {
          // Fotograma sin código: se ignora para no saturar la consola.
        },
      );
      camaraActiva.value = true;
    } catch (err: unknown) {
      camaraActiva.value = false;
      mensajeCamara.value = mensajeErrorParaUsuario(err, 'No se pudo iniciar la cámara. Verifica los permisos.');
    }
  }

  async function detener(): Promise<void> {
    if (escaner && camaraActiva.value) {
      try {
        await escaner.stop();
        await escaner.clear();
      } catch {
        // Si la cámara ya estaba detenida no hay nada más que hacer.
      }
    }
    camaraActiva.value = false;
  }

  async function alternar(): Promise<void> {
    if (camaraActiva.value) await detener();
    else await iniciar();
  }

  return { camaraActiva, mensajeCamara, iniciar, detener, alternar };
}
