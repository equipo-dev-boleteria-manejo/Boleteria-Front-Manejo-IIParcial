/**
 * renderizarSsr.ts - Renderiza componentes .vue a HTML en los tests, sin DOM ni dependencias extra
 *
 * Usa el renderizador de servidor de Vue, que ya viene con `vue`. Permite verificar los estados
 * visuales (cargando, error, vacío, datos) pero no simular clics. Solo lo importan archivos .test.ts.
 */

import { createSSRApp, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';

interface OpcionesRender {
  /** Instala Pinia, necesaria para componentes que usan stores. */
  conPinia?: boolean;
}

export interface ResultadoRender {
  /** HTML del componente. */
  html: string;
  /** HTML de lo teletransportado a <body> (por ejemplo, el contenido de un modal). */
  cuerpo: string;
}

export async function renderizar(
  componente: Component,
  props: Record<string, unknown> = {},
  opciones: OpcionesRender = {},
): Promise<ResultadoRender> {
  const app = createSSRApp(componente, props);
  if (opciones.conPinia) app.use(createPinia());

  const contexto: { teleports?: Record<string, string> } = {};
  const html = await renderToString(app, contexto);

  return { html, cuerpo: contexto.teleports?.body ?? '' };
}
