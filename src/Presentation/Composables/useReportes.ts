/**
 * useReportes.ts - Composable de Presentación para Auditoría y Métricas de Trazabilidad
 *
 * Arquitectura:
 * - 100% desacoplado de llamadas directas a base de datos o clientes de infraestructura.
 * - Encapsula estado reactivo de filtros, paginación y búsqueda (Headless Composable).
 * - Consume IAuditRepository y ObtenerConteoCambios UseCase a través de inversión de dependencias.
 */

import { ref, computed, watch } from 'vue';
import type { IAuditRepository, EventoAuditoria } from '../../Domain/Repositories/IAuditRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';
import {
  ObtenerConteoCambios,
  obtenerConteoCambiosUseCase as defaultConteoCambiosUseCase,
  type ConteoCambiosResultado,
} from '../../Application/UseCases/ObtenerConteoCambios';

function normalizarTexto(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos
    .replace(/[_-]+/g, ' ')           // Trata guiones bajos y medios como espacios
    .replace(/\s+/g, ' ')             // Normaliza múltiples espacios
    .trim();
}

export function useReportes(
  auditRepo: IAuditRepository = new SupabaseAuditRepository(),
  conteoCambiosService: ObtenerConteoCambios = defaultConteoCambiosUseCase
) {
  const eventosAuditoria = ref<EventoAuditoria[]>([]);
  const resumenCambios = ref<ConteoCambiosResultado | null>(null);

  const busqueda = ref('');
  const filtroResultado = ref('Todos');
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  const loading = ref({
    auditoria: false,
    cambios: false,
  });

  const error = ref<{ auditoria: string | null; cambios: string | null }>({
    auditoria: null,
    cambios: null,
  });

  watch([busqueda, filtroResultado, itemsPerPage], () => {
    currentPage.value = 1;
  });

  function limpiarFiltros(): void {
    busqueda.value = '';
    filtroResultado.value = 'Todos';
    currentPage.value = 1;
  }

  const eventosFiltrados = computed(() => {
    const terminoNormalizado = normalizarTexto(busqueda.value);
    const palabrasClave = terminoNormalizado.split(' ').filter(Boolean);

    return eventosAuditoria.value.filter((e) => {
      if (filtroResultado.value !== 'Todos') {
        const res = normalizarTexto(e.resultado);
        const filtroRes = normalizarTexto(filtroResultado.value);
        if (res !== filtroRes) return false;
      }

      if (palabrasClave.length > 0) {
        const corpus = normalizarTexto(
          `${e.accion || ''} ${e.detalle || ''} ${e.entidadAfectada || ''}`
        );
        return palabrasClave.every((palabra) => corpus.includes(palabra));
      }

      return true;
    });
  });

  const totalEventos = computed(() => eventosFiltrados.value.length);
  const totalPages = computed(() => Math.max(1, Math.ceil(totalEventos.value / itemsPerPage.value)));

  const eventosPaginados = computed(() => {
    const inicio = (currentPage.value - 1) * itemsPerPage.value;
    return eventosFiltrados.value.slice(inicio, inicio + itemsPerPage.value);
  });

  const metricasAuditoria = computed(() => {
    const total = eventosAuditoria.value.length;
    let exitos = 0;
    let fallos = 0;
    let seguridad = 0;

    for (const e of eventosAuditoria.value) {
      const res = (e.resultado || '').toLowerCase();
      const accion = (e.accion || '').toLowerCase();

      if (res.includes('exito') || res.includes('success')) {
        exitos++;
      } else if (res.includes('fallo') || res.includes('error') || res.includes('rechaz')) {
        fallos++;
      }

      if (
        accion.includes('login') ||
        accion.includes('auth') ||
        accion.includes('seguridad') ||
        accion.includes('usuario') ||
        accion.includes('acceso')
      ) {
        seguridad++;
      }
    }

    return {
      total,
      exitos,
      fallos,
      seguridad,
    };
  });

  async function cargarAuditoria(limite: number = 50): Promise<void> {
    loading.value.auditoria = true;
    error.value.auditoria = null;

    try {
      eventosAuditoria.value = await auditRepo.obtenerEventos(limite);
    } catch (err: unknown) {
      error.value.auditoria = err instanceof Error ? err.message : 'Error al consultar el registro de auditoría';
    } finally {
      loading.value.auditoria = false;
    }
  }

  async function cargarResumenCambios(): Promise<void> {
    loading.value.cambios = true;
    error.value.cambios = null;

    try {
      resumenCambios.value = await conteoCambiosService.execute();
    } catch (err: unknown) {
      error.value.cambios = err instanceof Error ? err.message : 'Error al obtener el balance de cambios';
    } finally {
      loading.value.cambios = false;
    }
  }

  async function recargarTodo(): Promise<void> {
    await Promise.all([cargarAuditoria(), cargarResumenCambios()]);
  }

  async function registrarEvento(
    accion: string,
    detalle?: string,
    entidadAfectada?: string,
    entidadId?: string | number
  ): Promise<void> {
    try {
      await auditRepo.registrarEvento({
        accion,
        detalle,
        entidadAfectada,
        entidadId,
        fecha: new Date(),
        resultado: 'Exito',
      });
    } catch {
      // La auditoría no debe bloquear el flujo principal si falla
    }
  }

  return {
    eventosAuditoria,
    resumenCambios,
    metricasAuditoria,
    busqueda,
    filtroResultado,
    currentPage,
    itemsPerPage,
    eventosFiltrados,
    totalEventos,
    totalPages,
    eventosPaginados,
    loading,
    error,
    limpiarFiltros,
    cargarAuditoria,
    cargarResumenCambios,
    recargarTodo,
    registrarEvento,
  };
}
