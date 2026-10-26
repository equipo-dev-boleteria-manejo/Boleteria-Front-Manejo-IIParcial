<template>
  <div class="space-y-1.5" :class="containerClass">
    <label
      v-if="label"
      :for="id"
      class="block text-xs font-bold uppercase tracking-wider text-slate-600"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <div
        v-if="$slots.prefix"
        class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"
      >
        <slot name="prefix" />
      </div>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        :class="[
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100',
          $slots.prefix ? 'pl-10' : '',
          $slots.suffix ? 'pr-10' : ''
        ]"
        @input="onInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <div
        v-if="$slots.suffix"
        class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
      >
        <slot name="suffix" />
      </div>
    </div>

    <p v-if="error" class="text-xs font-semibold text-red-600 flex items-center gap-1">
      <span>⚠️</span>
      <span>{{ error }}</span>
    </p>
    <p v-else-if="helperText" class="text-xs text-slate-500">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | number | null
  label?: string
  id?: string
  type?: string
  placeholder?: string
  error?: string | null
  helperText?: string
  disabled?: boolean
  required?: boolean
  autocomplete?: string
  containerClass?: string
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  id: () => `input-${Math.random().toString(36).slice(2, 9)}`,
  type: 'text',
  placeholder: '',
  error: null,
  helperText: '',
  disabled: false,
  required: false,
  autocomplete: 'off',
  containerClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>
