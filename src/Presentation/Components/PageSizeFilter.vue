<template>
  <SelectFilter
    :id="id"
    :label="label"
    :model-value="modelValue"
    :options="normalizedOptions"
    :disabled="disabled"
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SelectFilter, { type SelectOption } from './SelectFilter.vue'

interface Props {
  modelValue?: number
  label?: string
  options?: number[]
  disabled?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 10,
  label: 'Mostrar:',
  options: () => [5, 10, 20, 50],
  disabled: false,
  id: 'filtro-tamanio-pagina',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map((opt) => ({
    value: opt,
    label: `${opt} filas`,
  }))
})

function onUpdate(val: string | number) {
  emit('update:modelValue', Number(val))
}
</script>
