<template>
  <div class="bg-slate-50/70 border-t border-slate-100 px-4 py-2.5 sm:px-6 sm:py-3 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <p class="text-xs font-semibold text-slate-500">
        Mostrando página <span class="font-bold text-slate-900">{{ currentPage }}</span> de <span class="font-bold text-slate-900">{{ totalPages }}</span>
        <span v-if="totalItems !== undefined" class="text-slate-400 font-normal">({{ totalItems }} registros)</span>
      </p>
    </div>

    <div class="flex items-center gap-1.5">
      <button
        type="button"
        @click="$emit('prev')"
        :disabled="!hasPrevPage"
        class="h-8 px-2.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs"
      >
        ← Anterior
      </button>

      <div class="flex items-center gap-1">
        <button
          v-for="page in visiblePages"
          :key="page"
          type="button"
          @click="$emit('setPage', page)"
          class="h-8 min-w-8 px-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center"
          :class="page === currentPage
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'"
        >
          {{ page }}
        </button>
      </div>

      <button
        type="button"
        @click="$emit('next')"
        :disabled="!hasNextPage"
        class="h-8 px-2.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs"
      >
        Siguiente →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  hasPrevPage?: boolean
  hasNextPage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
  hasPrevPage: false,
  hasNextPage: false,
})

defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'setPage', page: number): void
}>()

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxButtons = 5
  let start = Math.max(1, props.currentPage - Math.floor(maxButtons / 2))
  const end = Math.min(props.totalPages, start + maxButtons - 1)

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})
</script>
