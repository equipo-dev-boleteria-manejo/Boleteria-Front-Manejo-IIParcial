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
        @keydown.esc="closeOnEsc ? close() : undefined"
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
            <!-- Header con Estilo Identitario del Sistema -->
            <div
              class="flex items-center justify-between px-6 py-4.5 border-b"
              :class="headerClasses"
            >
              <slot name="header">
                <div class="flex items-center gap-2.5">
                  <div
                    v-if="variant === 'primary'"
                    class="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse"
                  ></div>
                  <h3
                    class="text-sm font-black tracking-wide"
                    :class="variant === 'primary' ? 'text-white uppercase' : 'text-slate-900'"
                  >
                    {{ title }}
                  </h3>
                </div>
              </slot>

              <button
                type="button"
                class="rounded-lg p-1.5 transition-colors cursor-pointer"
                :class="
                  variant === 'primary'
                    ? 'text-blue-100 hover:text-white hover:bg-white/10'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                "
                aria-label="Cerrar modal"
                @click="close"
              >
                <span class="text-base leading-none font-bold">✕</span>
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
  closeOnEsc?: boolean
  variant?: 'primary' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  maxWidth: 'md',
  closeOnClickOutside: true,
  closeOnEsc: true,
  variant: 'primary',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const headerClasses = computed(() => {
  if (props.variant === 'primary') {
    return 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white border-blue-800/40 shadow-xs'
  }
  return 'bg-white text-slate-900 border-slate-100'
})

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
  if (e.key === 'Escape' && props.modelValue && props.closeOnEsc) {
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
