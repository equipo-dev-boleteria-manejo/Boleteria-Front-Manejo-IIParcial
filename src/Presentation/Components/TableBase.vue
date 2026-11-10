<template>
  <div class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
    <!-- Header opcional de la tabla -->
    <div
      v-if="$slots.header || title"
      class="border-b border-slate-100 bg-white px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <slot name="header">
        <div>
          <h3 class="text-base font-bold text-slate-900 tracking-tight">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </slot>
    </div>

    <!-- Barra de Búsqueda y Filtros -->
    <div
      v-if="$slots.filters"
      class="border-b border-slate-100 bg-slate-50/50 p-3 sm:px-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
    >
      <slot name="filters" />
    </div>

    <!-- 1. Estado CARGANDO (Esqueleto accesible) -->
    <div
      v-if="loading"
      class="p-6 space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Cargando datos"
    >
      <span class="sr-only">Cargando registros...</span>
      <div
        v-for="i in skeletonRows"
        :key="i"
        class="h-12 w-full animate-pulse rounded-xl bg-slate-100"
      ></div>
    </div>

    <!-- 2. Estado VACÍO (Sin registros o filtros sin coincidencia) -->
    <div
      v-else-if="empty"
      class="px-6 py-14 text-center"
      role="region"
      aria-label="Sin registros"
    >
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl"
        aria-hidden="true"
      >
        <slot name="empty-icon">{{ emptyIcon }}</slot>
      </div>

      <h4 class="mt-4 text-base font-bold text-slate-800">
        <slot name="empty-title">{{ emptyTitle }}</slot>
      </h4>

      <p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        <slot name="empty-description">{{ emptyDescription }}</slot>
      </p>

      <div v-if="$slots['empty-action']" class="mt-5 flex justify-center">
        <slot name="empty-action" />
      </div>
    </div>

    <!-- 3. Contenedor de la Tabla con Datos -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm border-collapse" :aria-label="ariaLabel || title">
        <thead class="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
          <slot name="thead">
            <tr v-if="columns && columns.length">
              <th
                v-for="col in columns"
                :key="col.key"
                scope="col"
                class="px-6 py-3.5"
                :class="[
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                  col.headerClass || '',
                ]"
              >
                {{ col.label }}
              </th>
            </tr>
          </slot>
        </thead>

        <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
          <slot />
        </tbody>
      </table>
    </div>

    <!-- Footer opcional (Paginación / Resumen) -->
    <div
      v-if="$slots.footer"
      class="border-t border-slate-100 bg-slate-50/40 px-5 py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  headerClass?: string
}

interface Props {
  title?: string
  subtitle?: string
  loading?: boolean
  empty?: boolean
  emptyIcon?: string
  emptyTitle?: string
  emptyDescription?: string
  skeletonRows?: number
  columns?: TableColumn[]
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  loading: false,
  empty: false,
  emptyIcon: '📂',
  emptyTitle: 'No se encontraron registros',
  emptyDescription: 'No existen elementos para mostrar en este momento.',
  skeletonRows: 5,
  columns: () => [],
  ariaLabel: 'Tabla de datos',
})
</script>
