<template>
  <div class="space-y-6">
    <!-- Encabezado con CardBase -->
    <CardBase
      title="Control de Abordaje y Validación de Boletos"
      subtitle="Escaneo y verificación de códigos QR de boletos en tiempo real"
      padding="lg"
    >
      <template #header-action>
        <div class="flex items-center gap-2">
          <RefreshButton
            :loading="loading"
            @click="recargarRuta"
          />
        </div>
      </template>

      <!-- Identidad obtenida exclusivamente de la sesión autenticada -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-100">
            👮
          </span>
          <div>
            <p class="text-xs font-bold text-slate-800">
              Conductor: {{ nombreChofer }}
            </p>
            <p class="text-[11px] text-slate-400">
              ID de usuario: {{ authStore.user?.id || 'No especificado' }}
            </p>
          </div>
        </div>
      </div>
    </CardBase>

    <!-- 1. Estado de Error Principal -->
    <div
      v-if="error"
      role="alert"
      class="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2">
        <span class="text-xl">⚠️</span>
        <span>{{ error }}</span>
      </div>
      <ButtonBase variant="secondary" size="sm" @click="recargarRuta">
        Reintentar
      </ButtonBase>
    </div>

    <!-- 2. Estado de Carga (Loading) -->
    <div
      v-if="loading && !rutaActual"
      role="status"
      aria-label="Cargando ruta del chofer"
      class="rounded-2xl bg-white p-8 border border-slate-200/80 shadow-sm space-y-4"
    >
      <div class="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
      <div class="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
      <p class="text-center text-xs text-slate-400 font-medium pt-2">Consultando viaje asignado al conductor...</p>
    </div>

    <!-- 3. Estado Vacío (Empty State) -->
    <div
      v-else-if="!esChoferAutorizado"
      class="rounded-2xl bg-white p-12 text-center border border-slate-200/80 shadow-sm space-y-3"
    >
      <div class="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto">
        🚌
      </div>
      <h3 class="text-base font-bold text-slate-800">
        {{ esChoferSesion ? 'No hay ruta activa asignada' : 'Acceso de operación restringido' }}
      </h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        <template v-if="esChoferSesion">
          No se encontró un viaje programado o en curso asignado a tu usuario
          <strong class="text-slate-700">{{ authStore.user?.id }}</strong> para hoy.
        </template>
        <template v-else>
          Solo el chofer autenticado y asignado a la ruta puede operar viajes y validar boletos.
        </template>
      </p>
    </div>

    <!-- 4. Estado con Datos: Ruta Activa + Validación QR (Success / Data) -->
    <div v-else class="space-y-6">
      <!-- Tarjeta Resumen de la Ruta Activa -->
      <div class="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg">🛣️</span>
              <h3 class="text-lg font-bold text-slate-900">
                Viaje Operativo #{{ rutaActual?.id }}
              </h3>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                :class="getEstadoBadgeClass(rutaActual?.estado)"
              >
                {{ rutaActual?.estado }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Unidad #{{ rutaActual?.busId }} | Salida Programada: <strong class="font-mono text-slate-700">{{ rutaActual?.horaSalida || '--:--' }}</strong>
            </p>
          </div>

          <!-- Botones de Operación del Chofer -->
          <div class="flex flex-wrap items-center gap-2">
            <ButtonBase
              v-if="rutaProgramada && esChoferAutorizado"
              variant="primary"
              size="md"
              :loading="loading"
              @click="handleIniciarViaje"
            >
              <span>🚀</span>
              <span>Iniciar Viaje</span>
            </ButtonBase>

            <ButtonBase
              v-if="rutaEnCurso && esChoferAutorizado"
              variant="success"
              size="md"
              :loading="loading"
              @click="handleFinalizarViaje"
            >
              <span>🏁</span>
              <span>Finalizar Viaje</span>
            </ButtonBase>

            <ButtonBase
              v-if="rutaEnCurso && esChoferAutorizado"
              variant="danger"
              size="sm"
              :disabled="loading"
              @click="abrirModalEmergencia"
            >
              <span>🚨</span>
              <span>Reportar Novedad</span>
            </ButtonBase>
          </div>
        </div>

        <!-- Alerta de tiempo en viaje -->
        <div
          v-if="rutaEnCurso"
          class="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <span>⏱️</span>
            <span>Tiempo transcurrido en ruta: <strong>{{ minutosDesdeSalida }} minutos</strong></span>
          </div>
          <span
            v-if="requiereObservacionPorTiempo"
            class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase"
          >
            ⚠️ Supera tiempo estimado
          </span>
        </div>
      </div>

      <!-- Zona de Validación: Escáner QR y Entrada Manual -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Panel Izquierdo: Escáner Cámara -->
        <CardBase
          title="Escáner QR con Cámara"
          subtitle="Enfoca el código QR impreso o digital del boleto del pasajero"
          padding="md"
        >
          <div class="space-y-4">
            <!-- Botones de Control de Cámara -->
            <div class="flex items-center justify-between">
              <ButtonBase
                :variant="camaraActiva ? 'danger' : 'primary'"
                size="sm"
                :disabled="!esChoferAutorizado || !rutaEnCurso || loading"
                @click="toggleCamara"
              >
                <span>📷</span>
                <span>{{ camaraActiva ? 'Detener Cámara' : 'Activar Cámara' }}</span>
              </ButtonBase>

              <span
                class="text-xs font-medium"
                :class="camaraActiva ? 'text-emerald-600' : 'text-slate-400'"
              >
                {{ camaraActiva ? '● Cámara en vivo' : '○ Cámara inactiva' }}
              </span>
            </div>

            <!-- Contenedor del video del escáner -->
            <div class="relative bg-slate-900 rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center border border-slate-800">
              <div id="chofer-qr-reader" class="w-full"></div>

              <div
                v-if="!camaraActiva"
                class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2 pointer-events-none"
              >
                <span class="text-4xl opacity-40">📸</span>
                <p class="text-xs font-bold text-slate-300">
                  {{ rutaEnCurso
                    ? 'Presiona "Activar Cámara" para iniciar la lectura continua de boletos'
                    : 'Debes iniciar el viaje antes de validar boletos' }}
                </p>
              </div>

              <!-- Spinner de procesando escaneo -->
              <div
                v-if="procesandoEscaneo"
                class="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-10"
              >
                <div class="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p class="text-xs font-bold">Validando código...</p>
              </div>
            </div>

            <!-- Mensajes de cámara -->
            <p v-if="mensajeCamara" class="text-xs text-amber-600 font-medium text-center">
              {{ mensajeCamara }}
            </p>
          </div>
        </CardBase>

        <!-- Panel Derecho: Entrada Manual de Código y Resultado -->
        <div class="space-y-6">
          <CardBase
            title="Validación Manual de Boleto"
            subtitle="Ingresa el código numérico o alfanumérico si el QR no es legible"
            padding="md"
          >
            <form class="space-y-3" @submit.prevent="handleValidarManual">
              <InputBase
                id="input-codigo-boleto"
                v-model="codigoManual"
                label="Código del Boleto"
                placeholder="Ej. BOL-2026-000123"
                required
                :disabled="!esChoferAutorizado || !rutaEnCurso || loading"
              >
                <template #prefix>
                  <span>🎟️</span>
                </template>
              </InputBase>

              <ButtonBase
                type="submit"
                variant="primary"
                size="md"
                full-width
                :loading="loading"
                :disabled="!esChoferAutorizado || !rutaEnCurso || !codigoManual.trim() || loading"
              >
                Validar Boleto
              </ButtonBase>
            </form>

            <!-- Banner de Éxito / Resultado Positivo -->
            <div
              v-if="success"
              role="status"
              class="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2.5"
            >
              <span class="text-lg">✅</span>
              <div>
                <p class="font-black text-sm text-emerald-900">¡Boleto Validado Exitosamente!</p>
                <p class="mt-0.5 text-emerald-700">{{ success }}</p>
              </div>
            </div>
          </CardBase>

          <!-- Historial de Validaciones de la Sesión -->
          <CardBase
            title="Historial de Abordaje"
            subtitle="Últimos boletos procesados durante este viaje"
            padding="md"
          >
            <div v-if="historial.length === 0" class="py-6 text-center text-xs text-slate-400">
              Aún no se han escaneado boletos en esta sesión.
            </div>

            <div v-else class="space-y-2 max-h-56 overflow-y-auto">
              <div
                v-for="(item, idx) in historial"
                :key="idx"
                class="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                :class="item.resultado === 'Validado'
                  ? 'border-emerald-100 bg-emerald-50/50'
                  : 'border-red-100 bg-red-50/50'"
              >
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-slate-700">{{ item.codigo }}</span>
                  <span class="text-[10px] text-slate-400">({{ item.hora }})</span>
                </div>
                <span
                  class="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase"
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

    <!-- Modal: Confirmar Finalización con Observación -->
    <ModalBase
      v-if="esChoferAutorizado"
      v-model="mostrarModalObservacion"
      title="Finalizar Viaje Operativo"
      max-width="md"
    >
      <form id="form-finalizar-observacion" class="space-y-3" @submit.prevent="confirmarFinalizacion">
        <p class="text-xs text-slate-600">
          El viaje ha superado el tiempo estimado o requiere un cierre documentado. Por favor, ingresa una observación final.
        </p>

        <InputBase
          id="obs-finalizar"
          v-model="observacion"
          label="Observación del Conductor"
          placeholder="Ej. Llegada a terminal sin novedades, retraso por tráfico..."
          required
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
        >
          Confirmar y Finalizar
        </ButtonBase>
      </template>
    </ModalBase>

    <!-- Modal: Reportar Emergencia / Novedad -->
    <ModalBase
      v-if="esChoferAutorizado"
      v-model="mostrarModalEmergencia"
      title="Reportar Incidente / Emergencia Operativa"
      max-width="md"
    >
      <form id="form-emergencia" class="space-y-3" @submit.prevent="confirmarEmergencia">
        <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <span>🚨</span>
          <span>Este reporte quedará registrado en la bitácora de auditoría y notificará al centro de control.</span>
        </div>

        <InputBase
          id="obs-emergencia"
          v-model="observacion"
          label="Detalle de la Emergencia o Incidente"
          placeholder="Ej. Falla mecánica en km 45, transbordo solicitado..."
          required
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
          :disabled="!observacion.trim()"
        >
          Registrar Emergencia
        </ButtonBase>
      </template>
    </ModalBase>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import CardBase from '../../Components/CardBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import InputBase from '../../Components/InputBase.vue'
import ModalBase from '../../Components/ModalBase.vue'
import { useChoferRuta } from '../../Composables/useChoferRuta'
import { useAuthStore } from '../../Store/authStore'
import { useFeedback } from '../../Composables/useFeedback'
import { extraerCodigoBoleto } from '../../../utils/qrcode'
import { RolUsuario, EstadoRuta } from '../../../Domain/Constants/EstadosSistema'
import { mensajeErrorParaUsuario } from '../../Utils/errorMessage'

const QR_READER_ID = 'chofer-qr-reader'

const authStore = useAuthStore()
const { showSuccess, showWarning, showError, confirm } = useFeedback()

const {
  rutaActual,
  historial,
  loading,
  error,
  success,
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

const codigoManual = ref('')
const mensajeCamara = ref('')
const camaraActiva = ref(false)
const procesandoEscaneo = ref(false)

const mostrarModalObservacion = ref(false)
const mostrarModalEmergencia = ref(false)
const observacion = ref('')

let html5QrCode: Html5Qrcode | null = null
let ultimoCodigoEscaneado = ''
let ultimoScanTimestamp = 0

const choferIdSesion = computed(() => authStore.user?.id || '')
const esChoferSesion = computed(
  () => authStore.role === RolUsuario.CHOFER && Boolean(choferIdSesion.value),
)
const esChoferAutorizado = computed(
  () => esChoferSesion.value && rutaActual.value?.choferId === choferIdSesion.value,
)

const nombreChofer = computed(() => {
  return authStore.user?.nombre || authStore.user?.nombres || 'Conductor Autorizado'
})

onMounted(async () => {
  await recargarRuta()
})

onBeforeUnmount(() => {
  void detenerCamara()
})

watch(esChoferAutorizado, (autorizado) => {
  if (!autorizado) void detenerCamara()
})

async function recargarRuta() {
  if (!esChoferSesion.value) {
    limpiar()
    return
  }

  try {
    await cargarRutaChofer(choferIdSesion.value)
  } catch {
    // error capturado por useChoferRuta
  }
}

async function handleIniciarViaje() {
  if (!esChoferAutorizado.value) return

  const confirmado = await confirm({
    title: 'Iniciar Salida',
    message: '¿Confirmas el inicio del viaje? El bus pasará a estado En Curso.',
    type: 'info',
  })

  if (confirmado) {
    const res = await iniciarViaje()
    if (res.ok) {
      showSuccess('El viaje ha comenzado. Ya puedes escanear boletos.')
    }
  }
}

async function handleFinalizarViaje() {
  if (!esChoferAutorizado.value) return

  if (requiereObservacionPorTiempo.value) {
    observacion.value = ''
    mostrarModalObservacion.value = true
    return
  }

  const confirmado = await confirm({
    title: 'Finalizar Viaje',
    message: '¿Confirmas que el viaje ha finalizado con éxito?',
    type: 'info',
  })

  if (confirmado) {
    await detenerCamara()
    const res = await finalizarViaje()
    if (res.ok) {
      showSuccess('El viaje ha finalizado correctamente.')
    }
  }
}

async function confirmarFinalizacion() {
  if (!esChoferAutorizado.value) return

  await detenerCamara()
  const res = await finalizarViaje(observacion.value)
  if (res.ok) {
    mostrarModalObservacion.value = false
    observacion.value = ''
    showSuccess('El viaje ha finalizado con observación registrada.')
  }
}

function abrirModalEmergencia() {
  if (!esChoferAutorizado.value) return

  observacion.value = ''
  mostrarModalEmergencia.value = true
}

async function confirmarEmergencia() {
  if (!esChoferAutorizado.value || !observacion.value.trim()) return
  const res = await marcarEmergencia(observacion.value)
  if (res.ok) {
    mostrarModalEmergencia.value = false
    observacion.value = ''
    showWarning('Se ha registrado la novedad y notificado a la administración.')
  }
}

async function handleValidarManual() {
  if (!esChoferAutorizado.value || !codigoManual.value.trim()) return
  const codigo = codigoManual.value.trim()
  codigoManual.value = ''
  await procesarCodigo(codigo)
}

async function procesarCodigo(codigoCrudo: string) {
  if (!esChoferAutorizado.value) return

  const codigo = extraerCodigoBoleto(codigoCrudo)
  if (!codigo) return

  procesandoEscaneo.value = true
  try {
    await validarQrBoleto(codigo)
  } finally {
    procesandoEscaneo.value = false
  }
}

async function toggleCamara() {
  if (camaraActiva.value) {
    await detenerCamara()
  } else {
    await iniciarCamara()
  }
}

async function iniciarCamara() {
  mensajeCamara.value = ''

  if (!esChoferAutorizado.value) {
    mensajeCamara.value = 'Solo el chofer asignado puede validar boletos.'
    return
  }

  if (!rutaEnCurso.value) {
    mensajeCamara.value = 'Primero debes iniciar el viaje para activar el escáner.'
    return
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    mensajeCamara.value = 'El navegador no permite el acceso a la cámara. Usa la validación manual.'
    return
  }

  try {
    await nextTick()
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode(QR_READER_ID)
    }

    const config = {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
      ],
    }

    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      async (decodedText) => {
        const ahora = Date.now()
        if (decodedText === ultimoCodigoEscaneado && ahora - ultimoScanTimestamp < 2500) {
          return // Evitar lecturas duplicadas continuas del mismo código
        }
        ultimoCodigoEscaneado = decodedText
        ultimoScanTimestamp = ahora
        await procesarCodigo(decodedText)
      },
      () => {
        // Callback vacío de frame no detectado para no saturar consola
      }
    )

    camaraActiva.value = true
  } catch (err: unknown) {
    camaraActiva.value = false
    mensajeCamara.value = mensajeErrorParaUsuario(
      err,
      'No se pudo iniciar la cámara. Verifica los permisos.',
    )
  }
}

async function detenerCamara() {
  if (html5QrCode && camaraActiva.value) {
    try {
      await html5QrCode.stop()
      await html5QrCode.clear()
    } catch {
      // Ignorar errores al detener la cámara
    }
  }
  camaraActiva.value = false
}

function getEstadoBadgeClass(estado?: string): string {
  switch (estado) {
    case EstadoRuta.PROGRAMADA:
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case EstadoRuta.EN_CURSO:
      return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
    case EstadoRuta.FINALIZADA:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case EstadoRuta.CANCELADA:
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
</script>
