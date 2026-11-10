<template>
  <div class="flex items-center gap-1.5">
    <label
      v-if="label"
      :for="id"
      class="text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none shrink-0"
    >
      {{ label }}
    </label>

    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        class="appearance-none rounded-xl border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
        @change="onChange"
      >
        <option
          v-for="opt in normalizedOptions"
          :key="String(opt.value)"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400"
        aria-hidden="true"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  modelValue?: string | number
  label?: string
  options?: Array<SelectOption | string | number>
  disabled?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  options: () => [],
  disabled: false,
  id: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt as SelectOption
    }
    return {
      value: opt,
      label: String(opt),
    }
  })
})

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const original = normalizedOptions.value.find((opt) => String(opt.value) === target.value)
  const val = original ? original.value : target.value
  emit('update:modelValue', val)
  emit('change', val)
}
</script>
