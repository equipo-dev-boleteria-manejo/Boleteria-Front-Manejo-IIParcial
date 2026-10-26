<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center"
        @click.self="onBackdropClick"
        @keydown.esc="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
        >
          <div
            class="relative w-full rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            :class="maxWidthClass"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <slot name="header">
                <h3 class="text-base font-bold text-slate-900">
                  {{ title }}
                </h3>
              </slot>

              <button
                type="button"
                class="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar modal"
                @click="close"
              >
                <span class="text-lg leading-none font-bold">✕</span>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 overflow-y-auto flex-1 text-sm text-slate-700">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5"
            >
              <slot name="footer" :close="close" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  closeOnClickOutside?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  maxWidth: 'md',
  closeOnClickOutside: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm':
      return 'max-w-sm'
    case 'lg':
      return 'max-w-lg'
    case 'xl':
      return 'max-w-xl'
    case '2xl':
      return 'max-w-2xl'
    case 'md':
    default:
      return 'max-w-md'
  }
})

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnClickOutside) {
    close()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

watch(
  () => props.modelValue,
  (val) => {
    if (typeof document !== 'undefined') {
      if (val) {
        document.body.classList.add('overflow-hidden')
      } else {
        document.body.classList.remove('overflow-hidden')
      }
    }
  }
)
</script>
