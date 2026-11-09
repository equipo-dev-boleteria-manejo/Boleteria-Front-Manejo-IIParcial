<template>
  <div class="space-y-3 max-w-7xl mx-auto font-sans">
    <!-- Barra de Filtros, Búsqueda y Registro Rápido -->
    <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="w-full md:w-80">
        <SearchInput
          v-model="busqueda"
          placeholder="Buscar por nombre, email o cédula..."
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        <SelectFilter
          label="Rol:"
          v-model="filtroRol"
          :options="opcionesRol"
        />

        <SelectFilter
          label="Mostrar:"
          v-model="registrosPorPagina"
          :options="[
            { value: 5, label: '5 filas' },
            { value: 10, label: '10 filas' },
            { value: 20, label: '20 filas' },
          ]"
        />

        <CreateButton
          label="Registrar Nuevo Usuario"
          @click="abrirModalCrear"
        />
      </div>
    </div>

    <!-- Estado 1: CARGANDO -->
    <div v-if="loading" class="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-sm space-y-4" aria-busy="true">
      <div class="animate-spin h-8 w-8 text-blue-600 mx-auto">
        <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultando usuarios registrados...</p>
    </div>

    <!-- Estado 2: VACÍO -->
    <div
      v-else-if="usuariosFiltrados.length === 0"
      class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-3"
    >
      <div class="text-4xl text-slate-300">👥</div>
      <h3 class="text-base font-black text-slate-800">No se encontraron usuarios</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        No existen registros que coincidan con los criterios de búsqueda o el rol seleccionado.
      </p>
      <div class="pt-2">
        <ButtonBase variant="outline" size="sm" @click="resetFiltros">
          Restablecer Filtros
        </ButtonBase>
      </div>
    </div>

    <!-- Estado 3: TABLA DE DATOS (Estilo TareasTable de IHC-Grupo2) -->
    <div v-else class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse" aria-label="Lista de usuarios registrados">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-3.5">Usuario</th>
              <th scope="col" class="px-6 py-3.5">Cédula</th>
              <th scope="col" class="px-6 py-3.5">Rol Asignado</th>
              <th scope="col" class="px-6 py-3.5 text-center">Estado</th>
              <th scope="col" class="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="u in usuariosPaginados"
              :key="u.id"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <td class="px-6 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs ring-1 ring-slate-200">
                    {{ (u.nombres || u.email || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 text-sm leading-tight">
                      {{ u.nombres }} {{ u.apellidos }}
                    </div>
                    <div class="text-slate-400 text-xs">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-3">
                <span class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 inline-block">
                  {{ u.cedula?.valor || 'N/D' }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span
                  class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs"
                  :class="rolBadgeClass(u.rol)"
                >
                  {{ u.rol }}
                </span>
              </td>
              <td class="px-6 py-3 text-center">
                <!-- Super Admin base: estado inmutable y protegido -->
                <span
                  v-if="esSuperAdmin(u.email) || esSuperAdmin(u.cedula?.valor)"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
                  title="Usuario base del sistema. No puede ser desactivado."
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span>🛡️ Intocable</span>
                </span>
                <button
                  v-else
                  type="button"
                  @click="toggleActivo(u)"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  :class="u.activo
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'"
                  :title="u.activo ? 'Clic para desactivar' : 'Clic para activar'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="u.activo ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  <span>{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
                </button>
              </td>
              <td class="px-6 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <ActionButton
                    action="edit"
                    :aria-label="`Editar usuario ${u.nombres}`"
                    @click="abrirModalEditar(u)"
                  />

                  <!-- Super Admin base protegido: botón de baja bloqueado -->
                  <span
                    v-if="esSuperAdmin(u.email) || esSuperAdmin(u.cedula?.valor)"
                    class="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg"
                    title="Este usuario es intocable"
                  >
                    Protegido
                  </span>
                  <ActionButton
                    v-else-if="u.activo"
                    action="danger"
                    label="Dar de Baja"
                    :aria-label="`Dar de baja a ${u.nombres}`"
                    @click="confirmarBaja(u)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Controles de Paginación -->
      <PaginationControls
        :current-page="paginaActual"
        :total-pages="totalPaginas"
        :total-items="totalUsuarios"
        :items-per-page="registrosPorPagina"
        :has-prev-page="paginaActual > 1"
        :has-next-page="paginaActual < totalPaginas"
        @prev="paginaActual--"
        @next="paginaActual++"
        @set-page="(p) => paginaActual = p"
      />
    </div>

    <!-- Modal Formulario para Crear / Editar Usuario (Estilo IHC-Grupo2) -->
    <ModalBase
      v-model="modalAbierto"
      :title="esEdicion ? 'Actualizar Información de Usuario' : 'Registrar Nuevo Usuario'"
      max-width="xl"
      :close-on-click-outside="false"
      :close-on-esc="false"
    >
      <form @submit.prevent="guardar" class="space-y-3.5">
        <div v-if="errorFormulario" class="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ errorFormulario }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <InputBase
            v-model="formulario.nombres"
            label="Nombres"
            required
            placeholder="Ej. María Fernanda"
          />
          <InputBase
            v-model="formulario.apellidos"
            label="Apellidos"
            required
            placeholder="Ej. Gómez Silva"
          />

          <InputBase
            v-model="cedula"
            label="Cédula Ecuatoriana"
            required
            maxlength="10"
            :disabled="esEdicion"
            :error="errorCedula"
            :helper-text="!errorCedula ? helperCedula : ''"
            placeholder="1710034065"
            @input="validateCedulaOnInput"
            @blur="validateCedula"
          />

          <InputBase
            v-model="email"
            label="Correo Electrónico"
            type="email"
            :disabled="esEdicion"
            :error="errorEmail"
            :helper-text="!errorEmail ? helperEmail : ''"
            required
            placeholder="usuario@cooperativa.ec"
            @input="validateEmailOnInput"
            @blur="validateEmail"
          />

          <!-- Credenciales solo en Creación -->
          <template v-if="!esEdicion">
            <InputBase
              v-model="password"
              label="Contraseña Inicial"
              :type="showPassword ? 'text' : 'password'"
              :error="errorPassword"
              required
              autocomplete="new-password"
              placeholder="••••••••"
              @blur="validatePassword"
            >
              <template #suffix>
                <button
                  type="button"
                  tabindex="-1"
                  @click.stop.prevent="showPassword = !showPassword"
                  class="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer select-none"
                >
                  {{ showPassword ? 'Ocultar' : 'Ver' }}
                </button>
              </template>
            </InputBase>

            <InputBase
              v-model="confirmPassword"
              label="Confirmar Contraseña"
              :type="showConfirmPassword ? 'text' : 'password'"
              :error="errorConfirmPassword"
              required
              autocomplete="new-password"
              placeholder="••••••••"
              @blur="validateConfirmPassword"
            >
              <template #suffix>
                <button
                  type="button"
                  tabindex="-1"
                  @click.stop.prevent="showConfirmPassword = !showConfirmPassword"
                  class="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer select-none"
                >
                  {{ showConfirmPassword ? 'Ocultar' : 'Ver' }}
                </button>
              </template>
            </InputBase>

            <!-- Medidor de Requisitos Compacto -->
            <div class="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Seguridad de contraseña</span>
                <span class="text-blue-600 font-black">{{ completedRequirements }}/4</span>
              </div>
              <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-600 transition-all duration-300"
                  :style="{ width: `${(completedRequirements / 4) * 100}%` }"
                ></div>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
                <span
                  v-for="req in passwordRequirements"
                  :key="req.label"
                  class="flex items-center gap-1 font-semibold"
                  :class="req.isValid ? 'text-emerald-700' : 'text-slate-400'"
                >
                  <span>{{ req.isValid ? '✓' : '•' }}</span>
                  <span>{{ req.label }}</span>
                </span>
              </div>
            </div>
          </template>

          <!-- Rol del Sistema -->
          <div class="sm:col-span-2 space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Rol del Sistema <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="formulario.rol"
                :disabled="esEdicion && (esSuperAdmin(email) || esSuperAdmin(cedula))"
                required
                class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed appearance-none pr-10"
              >
                <option :value="RolUsuario.ADMIN">Administrador</option>
                <option :value="RolUsuario.ENCARGADO">Encargado</option>
                <option :value="RolUsuario.OFICINISTA">Oficinista</option>
                <option :value="RolUsuario.CHOFER">Chofer</option>
                <option :value="RolUsuario.CLIENTE">Usuario Final / Cliente</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <!-- Estado de la Cuenta (Solo en Edición) -->
          <div v-if="esEdicion" class="sm:col-span-2 space-y-1.5 pt-1">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Estado de la Cuenta
            </label>
            <div class="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div class="flex items-center gap-2.5">
                <span
                  class="h-3 w-3 rounded-full"
                  :class="formulario.activo ? 'bg-emerald-500' : 'bg-slate-400'"
                ></span>
                <div>
                  <div class="text-xs font-bold text-slate-800">
                    {{ formulario.activo ? 'Usuario Activo' : 'Usuario Inactivo (Dado de baja)' }}
                  </div>
                  <div class="text-[11px] text-slate-500">
                    {{ formulario.activo ? 'Tiene acceso al sistema según sus permisos de rol.' : 'Su acceso al sistema se encuentra restringido.' }}
                  </div>
                </div>
              </div>

              <!-- Switch o Botón de Reactivación / Desactivación -->
              <button
                v-if="!esSuperAdmin(email) && !esSuperAdmin(cedula)"
                type="button"
                @click="formulario.activo = !formulario.activo"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                :class="
                  formulario.activo
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                "
              >
                {{ formulario.activo ? 'Desactivar Cuenta' : 'Reactivar Cuenta' }}
              </button>
              <span
                v-else
                class="text-[10px] font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-lg"
              >
                Protegido
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            @click="modalAbierto = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando"
            class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
          >
            {{ esEdicion ? 'Guardar Cambios' : 'Crear Usuario' }}
          </button>
        </div>
      </form>
    </ModalBase>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useUiStore } from '../Store/uiStore'
import { useUsuarios } from '../Composables/useUsuarios'
import { usePasswordValidation } from '../Composables/usePasswordValidation'
import { useCedulaValidation } from '../Composables/useCedulaValidation'
import { useEmailValidation } from '../Composables/useEmailValidation'
import { RolUsuario } from '../../Domain/Constants/EstadosSistema'
import { esSuperAdmin } from '../../Domain/Constants/SuperAdmin'
import type { Usuario } from '../../Domain/Entities/Usuario'
import ButtonBase from '../Components/ButtonBase.vue'
import ActionButton from '../Components/ActionButton.vue'
import SearchInput from '../Components/SearchInput.vue'
import SelectFilter from '../Components/SelectFilter.vue'
import CreateButton from '../Components/CreateButton.vue'
import InputBase from '../Components/InputBase.vue'
import ModalBase from '../Components/ModalBase.vue'
import PaginationControls from '../Components/PaginationControls.vue'

const opcionesRol = [
  { value: 'Todos', label: 'Todos los roles' },
  { value: RolUsuario.ADMIN, label: 'Administrador' },
  { value: RolUsuario.ENCARGADO, label: 'Encargado' },
  { value: RolUsuario.OFICINISTA, label: 'Oficinista' },
  { value: RolUsuario.CHOFER, label: 'Chofer' },
  { value: RolUsuario.CLIENTE, label: 'Usuario Final / Cliente' },
]

const uiStore = useUiStore()

const {
  usuarios,
  loading,
  error,
  mensajeExito,
  filtroRol,
  busqueda,
  paginaActual,
  registrosPorPagina,
  usuariosFiltrados,
  totalUsuarios,
  totalPaginas,
  usuariosPaginados,
  limpiarMensajes,
  cargarUsuarios,
  crear,
  actualizar,
  desactivar,
  toggleActivo,
  existeCedula,
  existeEmail,
} = useUsuarios()

const {
  password,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  errorPassword,
  errorConfirmPassword,
  passwordRequirements,
  completedRequirements,
  validatePassword,
  validateConfirmPassword,
  validateAll: validatePasswordAll,
  resetPasswordFields,
} = usePasswordValidation()

const {
  cedula,
  errorCedula,
  helperCedula,
  validateCedulaOnInput,
  validateCedula,
  resetCedula,
} = useCedulaValidation(existeCedula)

const {
  email,
  errorEmail,
  helperEmail,
  validateEmailOnInput,
  validateEmail,
  resetEmail,
} = useEmailValidation(existeEmail)

onMounted(() => {
  cargarUsuarios()
})

// Modal y Formulario
const modalAbierto = ref(false)
const esEdicion = ref(false)
const guardando = ref(false)
const errorFormulario = ref<string | null>(null)

const formulario = ref({
  id: '',
  nombres: '',
  apellidos: '',
  rol: RolUsuario.OFICINISTA as RolUsuario,
  activo: true,
})

watch([busqueda, filtroRol, registrosPorPagina], () => {
  paginaActual.value = 1
})

function resetFiltros() {
  busqueda.value = ''
  filtroRol.value = 'Todos'
  paginaActual.value = 1
}

function abrirModalCrear() {
  esEdicion.value = false
  formulario.value = {
    id: '',
    nombres: '',
    apellidos: '',
    rol: RolUsuario.OFICINISTA,
    activo: true,
  }
  resetCedula()
  resetEmail()
  resetPasswordFields()
  errorFormulario.value = null
  modalAbierto.value = true
}

function abrirModalEditar(u: Usuario) {
  esEdicion.value = true
  formulario.value = {
    id: u.id || '',
    nombres: u.nombres,
    apellidos: u.apellidos,
    rol: u.rol,
    activo: u.activo,
  }
  cedula.value = u.cedula?.valor || ''
  errorCedula.value = null
  email.value = u.email || ''
  errorEmail.value = null
  resetPasswordFields()
  errorFormulario.value = null
  modalAbierto.value = true
}

async function guardar() {
  errorFormulario.value = null

  if (!esEdicion.value) {
    const cedulaOk = await validateCedula()
    if (!cedulaOk || errorCedula.value) {
      errorFormulario.value = errorCedula.value || 'Por favor ingresa una cédula válida.'
      return
    }
    const emailOk = await validateEmail()
    if (!emailOk || errorEmail.value) {
      errorFormulario.value = errorEmail.value || 'Por favor ingresa un correo electrónico válido.'
      return
    }
    const passwordOk = validatePasswordAll()
    if (!passwordOk) {
      errorFormulario.value = 'Por favor completa y verifica los requisitos de la contraseña.'
      return
    }
  }

  guardando.value = true
  try {
    if (esEdicion.value) {
      await actualizar({
        id: formulario.value.id,
        nombres: formulario.value.nombres,
        apellidos: formulario.value.apellidos,
        rol: formulario.value.rol,
        activo: formulario.value.activo,
      })
      uiStore.showToast(`Usuario ${formulario.value.nombres} actualizado con éxito.`, 'success', 3000)
    } else {
      await crear({
        email: email.value,
        cedula: cedula.value,
        nombres: formulario.value.nombres,
        apellidos: formulario.value.apellidos,
        rol: formulario.value.rol,
        password: password.value,
      })
      uiStore.showToast(`Usuario ${formulario.value.nombres} registrado con éxito.`, 'success', 3000)
    }
    modalAbierto.value = false
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud'
    errorFormulario.value = msg
    uiStore.showToast(msg, 'error', 3000)
  } finally {
    guardando.value = false
  }
}

async function confirmarBaja(u: Usuario) {
  if (!u.id) return
  if (esSuperAdmin(u.email) || esSuperAdmin(u.cedula?.valor)) {
    uiStore.showAlert({
      title: 'Acción Bloqueada',
      message: 'El usuario Super Administrador es un registro base del sistema y no puede ser dado de baja.',
      type: 'warning',
    })
    return
  }

  const confirmado = await uiStore.showConfirm({
    title: 'Confirmación de Baja',
    message: `¿Estás seguro de que deseas dar de baja lógica al usuario "${u.nombres} ${u.apellidos}"? El usuario perderá acceso inmediato a la plataforma.`,
    type: 'warning',
    confirmText: 'Sí, dar de baja',
    cancelText: 'Cancelar',
  })

  if (confirmado) {
    try {
      await desactivar(u.id)
      uiStore.showToast(`Usuario ${u.nombres} ${u.apellidos} dado de baja exitosamente.`, 'success', 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo desactivar el usuario.'
      uiStore.showToast(msg, 'error', 3000)
    }
  }
}

function rolBadgeClass(rol: string): string {
  const r = (rol || '').toLowerCase()
  if (r.includes('admin')) return 'bg-purple-50 text-purple-800 border-purple-200'
  if (r.includes('oficinista')) return 'bg-blue-50 text-blue-800 border-blue-200'
  if (r.includes('chofer')) return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
</script>
