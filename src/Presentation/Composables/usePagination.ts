/**
 * usePagination.ts - Composable Reactivo Reutilizable para Paginación de Listas y Tablas
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Centraliza toda la matemática y control de paginación en cliente.
 * - Soporta arrays reactivos (Ref, ComputedRef o getters).
 * - Sincroniza automáticamente la página actual ante cambios en el tamaño de página o filtros.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

export interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
}

export function usePagination<T>(
  items: Ref<T[]> | ComputedRef<T[]> | (() => T[]),
  options: UsePaginationOptions = {}
) {
  const currentPage = ref(options.initialPage ?? 1)
  const pageSize = ref(options.initialPageSize ?? 10)

  const allItems = typeof items === 'function' ? computed(items) : computed(() => items.value)

  const totalItems = computed(() => allItems.value.length)

  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(totalItems.value / pageSize.value))
  })

  const paginatedItems = computed<T[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return allItems.value.slice(start, end)
  })

  const hasPrevPage = computed(() => currentPage.value > 1)
  const hasNextPage = computed(() => currentPage.value < totalPages.value)

  const startIndex = computed(() => {
    if (totalItems.value === 0) return 0
    return (currentPage.value - 1) * pageSize.value + 1
  })

  const endIndex = computed(() => {
    return Math.min(currentPage.value * pageSize.value, totalItems.value)
  })

  function nextPage() {
    if (hasNextPage.value) {
      currentPage.value++
    }
  }

  function prevPage() {
    if (hasPrevPage.value) {
      currentPage.value--
    }
  }

  function setPage(page: number) {
    const clamped = Math.max(1, Math.min(page, totalPages.value))
    currentPage.value = clamped
  }

  function setPageSize(size: number) {
    pageSize.value = size
    currentPage.value = 1
  }

  function reset() {
    currentPage.value = 1
  }

  // Si cambia el total de elementos o el tamaño de página, evitar páginas fuera de rango
  watch([totalItems, pageSize], () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
    if (currentPage.value < 1) {
      currentPage.value = 1
    }
  })

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    hasPrevPage,
    hasNextPage,
    startIndex,
    endIndex,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
    reset,
  }
}
