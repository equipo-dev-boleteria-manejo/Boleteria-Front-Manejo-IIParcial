import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { usePagination } from './usePagination'

describe('usePagination Composable', () => {
  it('inicializa correctamente los valores por defecto', () => {
    const items = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const { currentPage, pageSize, totalPages, totalItems, paginatedItems, hasNextPage, hasPrevPage } =
      usePagination(items, { initialPageSize: 5 })

    expect(currentPage.value).toBe(1)
    expect(pageSize.value).toBe(5)
    expect(totalItems.value).toBe(12)
    expect(totalPages.value).toBe(3)
    expect(paginatedItems.value).toEqual([1, 2, 3, 4, 5])
    expect(hasNextPage.value).toBe(true)
    expect(hasPrevPage.value).toBe(false)
  })

  it('avanza y retrocede de página correctamente', () => {
    const items = ref(['a', 'b', 'c', 'd', 'e', 'f'])
    const { currentPage, paginatedItems, nextPage, prevPage, hasNextPage, hasPrevPage } =
      usePagination(items, { initialPageSize: 2 })

    nextPage()
    expect(currentPage.value).toBe(2)
    expect(paginatedItems.value).toEqual(['c', 'd'])
    expect(hasNextPage.value).toBe(true)
    expect(hasPrevPage.value).toBe(true)

    nextPage()
    expect(currentPage.value).toBe(3)
    expect(paginatedItems.value).toEqual(['e', 'f'])
    expect(hasNextPage.value).toBe(false)

    // No debe pasar del límite
    nextPage()
    expect(currentPage.value).toBe(3)

    prevPage()
    expect(currentPage.value).toBe(2)
  })

  it('cambia el tamaño de página y reinicia a la página 1', () => {
    const items = ref([1, 2, 3, 4, 5, 6, 7, 8])
    const { currentPage, pageSize, setPageSize, totalPages, paginatedItems } =
      usePagination(items, { initialPageSize: 2 })

    currentPage.value = 3
    setPageSize(5)

    expect(pageSize.value).toBe(5)
    expect(currentPage.value).toBe(1)
    expect(totalPages.value).toBe(2)
    expect(paginatedItems.value).toEqual([1, 2, 3, 4, 5])
  })

  it('calcula los índices de inicio y fin correctamente', () => {
    const items = ref(['x', 'y', 'z', 'w'])
    const { startIndex, endIndex, nextPage } = usePagination(items, { initialPageSize: 2 })

    expect(startIndex.value).toBe(1)
    expect(endIndex.value).toBe(2)

    nextPage()
    expect(startIndex.value).toBe(3)
    expect(endIndex.value).toBe(4)
  })

  it('soporta getter functions como fuente de datos', () => {
    const lista = ref([10, 20, 30])
    const { paginatedItems, totalItems } = usePagination(() => lista.value, { initialPageSize: 2 })

    expect(totalItems.value).toBe(3)
    expect(paginatedItems.value).toEqual([10, 20])
  })

  it('maneja listas vacías correctamente', () => {
    const items = ref<string[]>([])
    const { totalItems, totalPages, paginatedItems, startIndex, endIndex } = usePagination(items)

    expect(totalItems.value).toBe(0)
    expect(totalPages.value).toBe(1)
    expect(paginatedItems.value).toEqual([])
    expect(startIndex.value).toBe(0)
    expect(endIndex.value).toBe(0)
  })
})
