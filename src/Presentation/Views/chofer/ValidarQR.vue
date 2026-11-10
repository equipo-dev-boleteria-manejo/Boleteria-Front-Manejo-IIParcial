<template>
  <div class="space-y-6">
    <!-- Identidad del conductor, obtenida exclusivamente de la sesión autenticada -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs"
    >
      <div class="flex items-center gap-2.5">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-base"
          aria-hidden="true"
        >
          👮
        </span>
        <div>
          <p class="text-xs font-bold text-slate-800">Conductor: {{ nombreChofer }}</p>
          <p v-if="authStore.user?.email" class="text-[11px] text-slate-400">{{ authStore.user.email }}</p>
        </div>
      </div>
      <RefreshButton :loading="loading" @click="recargarRuta" />
    </div>

    <!-- Cargando -->
    <CardBase v-if="loading && !rutaActual" padding="none">
      <div class="space-y-3 p-5 sm:p-6" role="status" aria-live="polite" aria-label="Cargando ruta del chofer">
        <span class="sr-only">Consultando el viaje asignado al conductor...</span>
        <div class="h-6 w-1/3 animate-pulse rounded bg-slate-200"></div>
        <div class="h-24 animate-pulse rounded-xl bg-slate-100"></div>
      </div>
    </CardBase>

    <!-- Error al consultar la ruta -->
    <CardBase v-else-if="error && !rutaActual" padding="none">
      <div class="px-5 py-12 text-center sm:px-6" role="alert">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl"
          aria-hidden="true"
        >
          ⚠️
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No pudimos consultar tu viaje</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{{ error }}</p>
        <div class="mt-4 flex justify-center">
          <ButtonBase :loading="loading" @click="recargarRuta">Reintentar</ButtonBase>
        </div>
      </div>
    </CardBase>

    <!-- Sin ruta asignada o acceso restringido -->
    <CardBase v-else-if="!esChoferAutorizado" padding="none">
      <div class="px-5 py-12 text-center sm:px-6">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl"
          aria-hidden="true"
        >
          🚌
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">
          {{ esChoferSesion ? 'No hay ruta activa asignada' : 'Acceso de operación restringido' }}
        </h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          {{
            esChoferSesion
              ? `No se encontró un viaje programado o en curso asignado a ${nombreChofer} para hoy.`
              : 'Solo el chofer autenticado y asignado a la ruta puede operar viajes y validar boletos.'
          }}
        </p>
      </div>
    </CardBase>

    <!-- Ruta activa y validación de boletos -->
    <div v-else class="space-y-6">
      <div class="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900">Viaje operativo #{{ rutaActual?.id }}</h3>
              <span
                class="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                :class="claseBadgeEstadoRuta(rutaActual?.estado)"
              >
                {{ etiquetaEstadoRuta(rutaActual?.estado) }}
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              Unidad #{{ rutaActual?.busId }} · Salida programada:
              <strong class="font-mono text-slate-700">{{ rutaActual?.horaSalida || '--:--' }}</strong>
            </p>
          </div>

          <!-- Operación del chofer -->
          <div class="flex flex-wrap items-center gap-2">
            <ButtonBase v-if="rutaProgramada" variant="primary" size="md" :loading="loading" @click="handleIniciarViaje">
              🚀 Iniciar viaje
            </ButtonBase>
            <ButtonBase v-if="rutaEnCurso" variant="success" size="md" :loading="loading" @click="handleFinalizarViaje">
              🏁 Finalizar viaje
            </ButtonBase>
            <ButtonBase v-if="rutaEnCurso" variant="danger" size="sm" :disabled="loading" @click="abrirModalEmergencia">
              🚨 Reportar novedad
            </ButtonBase>
          </div>
        </div>

        <div
          v-if="rutaEnCurso"
          class="flex items-center justify-between gap-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-800"
        >
          <span>⏱️ Tiempo transcurrido en ruta: <strong>{{ minutosDesdeSalida }} minutos</strong></span>
          <span
            v-if="requiereObservacionPorTiempo"
            class="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800"
          >
            ⚠️ Supera el tiempo estimado
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Escáner con cámara -->
        <CardBase
          title="Escáner QR con cámara"
          subtitle="Enfoca el código QR impreso o digital del boleto del pasajero"
          padding="md"
        >
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <ButtonBase
                :variant="camaraActiva ? 'danger' : 'primary'"
                size="sm"
                :disabled="!rutaEnCurso || loading"
                @click="alternar"
              >
                📷 {{ camaraActiva ? 'Detener cámara' : 'Activar cámara' }}
              </ButtonBase>
              <span class="text-xs font-medium" :class="camaraActiva ? 'text-emerald-600' : 'text-slate-400'">
                {{ camaraActiva ? '● Cámara en vivo' : '○ Cámara inactiva' }}
              </span>
            </div>

            <div
              class="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              <div :id="ID_CONTENEDOR_QR" class="w-full"></div>

              <div
                v-if="!camaraActiva"
                class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center space-y-2 p-6 text-center text-slate-400"
              >
                <span class="text-4xl opacity-40" aria-hidden="true">📸</span>
                <p class="text-xs font-bold text-slate-300">
                  {{
                    rutaEnCurso
                      ? 'Presiona "Activar cámara" para iniciar la lectura continua de boletos'
                      : 'Debes iniciar el viaje antes de validar boletos'
                  }}
                </p>
              </div>

              <div
                v-if="procesandoEscaneo"
                class="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-2 bg-slate-900/70 text-white"
              >
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
                <p class="text-xs font-bold">Validando código...</p>
              </div>
            </div>

            <p v-if="mensajeCamara" role="status" class="text-center text-xs font-medium text-amber-600">
              {{ mensajeCamara }}
            </p>
          </div>
        </CardBase>

        <div class="space-y-6">
          <!-- Validación manual -->
          <CardBase
            title="Validación manual de boleto"
            subtitle="Ingresa el código del boleto si el QR no es legible"
            padding="md"
          >
            <form class="space-y-3" novalidate @submit.prevent="handleValidarManual">
              <InputBase
                id="input-codigo-boleto"
                v-model="codigoManual.formulario.valor"
                label="Código del boleto"
                placeholder="Ej. BOL-2026-000123"
                required
                :disabled="!rutaEnCurso || loading"
                :error="codigoManual.error.value"
              >
                <template #prefix>
                  <span aria-hidden="true">🎟️</span>
                </template>
              </InputBase>

              <ButtonBase
                type="submit"
                variant="primary"
                size="md"
                full-width
                :loading="loading"
                :disabled="!rutaEnCurso || codigoManual.hayErroresVisibles.value"
              >
                Validar boleto
              </ButtonBase>
            </form>
          </CardBase>

          <!-- Historial de la sesión -->
          <CardBase title="Historial de abordaje" subtitle="Últimos boletos procesados durante este viaje" padding="md">
            <div v-if="historial.length === 0" class="py-6 text-center text-xs text-slate-400">
              Aún no se han escaneado boletos en esta sesión.
            </div>

            <div v-else class="max-h-56 space-y-2 overflow-y-auto">
              <div
                v-for="(item, indice) in historial"
                :key="indice"
                class="flex items-center justify-between rounded-xl border p-2.5 text-xs"
                :class="item.resultado === 'Validado' ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'"
              >
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-slate-700">{{ item.codigo }}</span>
                  <span class="text-[10px] text-slate-400">({{ item.hora }})</span>
                </div>
                <span
                  class="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                  :class="item.resultado === 'Validado' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                >
                  {{ item.resultado }}
                </span>
              </div>
            </div>
          </CardBase>
        </div>
      </div>
    </div>

    <!-- Modal: finalizar el viaje con observación -->
    <ModalBase v-if="esChoferAutorizado" v-model="mostrarModalObservacion" title="Finalizar viaje operativo" max-width="md">
      <form id="form-finalizar-observacion" class="space-y-3" novalidate @submit.prevent="confirmarFinalizacion">
        <p class="text-xs text-slate-600">
          El viaje superó el tiempo estimado o requiere un cierre documentado. Ingresa una observación final.
        </p>
        <InputBase
          id="obs-finalizar"
          v-model="obsFinalizar.formulario.valor"
          label="Observación del conductor"
          placeholder="Ej. Llegada a terminal sin novedades, retraso por tráfico..."
          required
          :error="obsFinalizar.error.value"
        />
      </form>

      <template #footer="{ close }">
        <ButtonBase variant="secondary" size="md" @click="close">Cancelar</ButtonBase>
        <ButtonBase
          type="submit"
          form="form-finalizar-observacion"
          variant="success"
          size="md"
          :loading="loading"
          :disabled="obsFinalizar.hayErroresVisibles.value"
        >
          Confirmar y finalizar
        </ButtonBase>
      </template>
    </ModalBase>

    <!-- Modal: reportar emergencia o novedad -->
    <ModalBase
      v-if="esChoferAutorizado"
      v-model="mostrarModalEmergencia"
      title="Reportar incidente / emergencia operativa"
      max-width="md"
    >
      <form id="form-emergencia" class="space-y-3" novalidate @submit.prevent="confirmarEmergencia">
        <div class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <span aria-hidden="true">🚨</span>
          <span>Este reporte quedará registrado en la bitácora de auditoría y notificará al centro de control.</span>
        </div>
        <InputBase
          id="obs-emergencia"
          v-model="obsEmergencia.formulario.valor"
          label="Detalle de la emergencia o incidente"
          placeholder="Ej. Falla mecánica en km 45, transbordo solicitado..."
          required
          :error="obsEmergencia.error.value"
        />
      </form>

      <template #footer="{ close }">
        <ButtonBase variant="secondary" size="md" @click="close">Cancelar</ButtonBase>
        <ButtonBase
          type="submit"
          form="form-emergencia"
          variant="danger"
          size="md"
          :loading="loading"
          :disabled="obsEmergencia.hayErroresVisibles.value"
        >
          Registrar emergencia
        </ButtonBase>
      </template>
    </ModalBase>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import CardBase from '../../Components/CardBase.vue'
import InputBase from '../../Components/InputBase.vue'
import ModalBase from '../../Components/ModalBase.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import { useCampoValidado } from '../../Composables/useCampoValidado'
import { useChoferRuta } from '../../Composables/useChoferRuta'
import { useEscanerQr } from '../../Composables/useEscanerQr'
import { useFeedback } from '../../Composables/useFeedback'
import { claseBadgeEstadoRuta, etiquetaEstadoRuta } from '../../Composables/presentacionRutas'
import { validarCodigoBoleto, validarObservacionObligatoria } from '../../Composables/validacionRutas'
import { useAuthStore } from '../../Store/authStore'
import { extraerCodigoBoleto } from '../../../utils/qrcode'
import { RolUsuario } from '../../../Domain/Constants/EstadosSistema'

const ID_CONTENEDOR_QR = 'chofer-qr-reader'

const authStore = useAuthStore()
const { showSuccess, showWarning, showError, confirm } = useFeedback()

const {
  rutaActual,
  historial,
  loading,
  error,
  rutaProgramada,
  rutaEnCurso,
  minutosDesdeSalida,
  requiereObservacionPorTiempo,
  cargarRutaChofer,
  iniciarViaje,
  finalizarViaje,
  marcarEmergencia,
  validarQrBoleto,
  limpiar,
} = useChoferRuta()

// Estado exclusivamente de interfaz.
const procesandoEscaneo = ref(false)
const mostrarModalObservacion = ref(false)
const mostrarModalEmergencia = ref(false)

const codigoManual = useCampoValidado(validarCodigoBoleto)
const obsFinalizar = useCampoValidado(validarObservacionObligatoria)
const obsEmergencia = useCampoValidado(validarObservacionObligatoria)

const choferIdSesion = computed(() => authStore.user?.id || '')
const esChoferSesion = computed(() => authStore.role === RolUsuario.CHOFER && Boolean(choferIdSesion.value))
const esChoferAutorizado = computed(
  () => esChoferSesion.value && rutaActual.value?.choferId === choferIdSesion.value,
)
const nombreChofer = computed(() => authStore.user?.nombre || authStore.user?.nombres || 'Conductor autorizado')

const { camaraActiva, mensajeCamara, alternar, detener } = useEscanerQr({
  idContenedor: ID_CONTENEDOR_QR,
  motivoBloqueo: () => {
    if (!esChoferAutorizado.value) return 'Solo el chofer asignado puede validar boletos.'
    if (!rutaEnCurso.value) return 'Primero debes iniciar el viaje para activar el escáner.'
    return ''
  },
  alLeer: (codigo) => procesarCodigo(codigo),
})

onMounted(() => {
  void recargarRuta()
})

onBeforeUnmount(() => {
  void detener()
})

watch(esChoferAutorizado, (autorizado) => {
  if (!autorizado) void detener()
})

async function recargarRuta() {
  if (!esChoferSesion.value) {
    limpiar()
    return
  }

  try {
    await cargarRutaChofer(choferIdSesion.value)
  } catch {
    // El mensaje queda en `error` y se muestra en el estado de error.
  }
}

async function handleIniciarViaje() {
  if (!esChoferAutorizado.value) return

  const confirmado = await confirm({
    title: 'Iniciar salida',
    message: '¿Confirmas el inicio del viaje? El bus pasará a estado En curso.',
    type: 'info',
  })
  if (!confirmado) return

  const resultado = await iniciarViaje()
  if (resultado.ok) showSuccess('El viaje comenzó. Ya puedes escanear boletos.')
  else showError(resultado.mensaje)
}

async function handleFinalizarViaje() {
  if (!esChoferAutorizado.value) return

  if (requiereObservacionPorTiempo.value) {
    obsFinalizar.iniciar()
    mostrarModalObservacion.value = true
    return
  }

  const confirmado = await confirm({
    title: 'Finalizar viaje',
    message: '¿Confirmas que el viaje finalizó con éxito?',
    type: 'info',
  })
  if (!confirmado) return

  await detener()
  const resultado = await finalizarViaje()
  if (resultado.ok) showSuccess('El viaje finalizó correctamente.')
  else showError(resultado.mensaje)
}

async function confirmarFinalizacion() {
  if (!esChoferAutorizado.value || !obsFinalizar.validarTodo()) return

  await detener()
  const resultado = await finalizarViaje(obsFinalizar.texto.value)
  if (resultado.ok) {
    mostrarModalObservacion.value = false
    showSuccess('El viaje finalizó con la observación registrada.')
  } else {
    showError(resultado.mensaje)
  }
}

function abrirModalEmergencia() {
  if (!esChoferAutorizado.value) return

  obsEmergencia.iniciar()
  mostrarModalEmergencia.value = true
}

async function confirmarEmergencia() {
  if (!esChoferAutorizado.value || !obsEmergencia.validarTodo()) return

  const resultado = await marcarEmergencia(obsEmergencia.texto.value)
  if (resultado.ok) {
    mostrarModalEmergencia.value = false
    showWarning('Se registró la novedad y se notificó a la administración.')
  } else {
    showError(resultado.mensaje)
  }
}

async function handleValidarManual() {
  if (!esChoferAutorizado.value || !codigoManual.validarTodo()) return

  const codigo = codigoManual.texto.value
  codigoManual.iniciar()
  await procesarCodigo(codigo)
}

async function procesarCodigo(codigoCrudo: string) {
  if (!esChoferAutorizado.value) return

  const codigo = extraerCodigoBoleto(codigoCrudo)
  if (!codigo) {
    showWarning('No se pudo leer un código válido. Inténtalo de nuevo.')
    return
  }

  procesandoEscaneo.value = true
  try {
    const resultado = await validarQrBoleto(codigo)
    if (resultado.ok) showSuccess(resultado.mensaje)
    else showError(resultado.mensaje)
  } finally {
    procesandoEscaneo.value = false
  }
}
</script>
