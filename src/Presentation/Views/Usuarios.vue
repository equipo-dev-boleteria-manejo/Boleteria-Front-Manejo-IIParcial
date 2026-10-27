<template>
  <div class="space-y-6 max-w-7xl mx-auto font-sans">
    <!-- Encabezado Principal y Acciones (Estilo IHC-Grupo2) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Gestión de Usuarios y Personal</h1>
        <p class="text-xs text-slate-500 mt-1">
          Administración de cuentas, choferes, personal de ventanilla y pasajeros con control de roles (RBAC).
        </p>
      </div>
      <div>
        <button
          type="button"
          @click="abrirModalCrear"
          class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>
    </div>

    <!-- Banner de Éxito -->
    <div
      v-if="mensajeExito"
      class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs"
      role="status"
    >
      <div class="flex items-center gap-2.5">
        <svg class="h-5 w-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ mensajeExito }}</span>
      </div>
      <button type="button" @click="limpiarMensajes" class="text-emerald-700 hover:text-emerald-950 font-bold p-1">✕</button>
    </div>

    <!-- Banner de Error -->
    <div
      v-if="error"
      class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between shadow-xs"
      role="alert"
    >
      <div class="flex items-center gap-2.5">
        <svg class="h-5 w-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <div class="flex items-center gap-3">
        <button type="button" @click="cargarUsuarios" class="underline font-bold text-rose-700 hover:text-rose-900 cursor-pointer">Reintentar</button>
        <button type="button" @click="limpiarMensajes" class="text-rose-500 hover:text-rose-800 font-bold p-1">✕</button>
      </div>
    </div>

    <!-- Barra de Filtros y Búsqueda (Estilo IHC-Grupo2) -->
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="w-full md:w-80">
        <InputBase
          v-model="busqueda"
          placeholder="Buscar por nombre, email o cédula..."
          container-class="w-full"
        >
          <template #prefix>
            <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
        </InputBase>
      </div>

      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-600 uppercase tracking-wider">Rol:</label>
          <select
            v-model="filtroRol"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option value="Todos">Todos los roles</option>
            <option value="Administrador">Administrador</option>
            <option value="Oficinista">Oficinista</option>
            <option value="Chofer">Chofer</option>
            <option value="Usuario Final">Usuario Final / Cliente</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-600 uppercase tracking-wider">Mostrar:</label>
          <select
            v-model="registrosPorPagina"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option :value="5">5 filas</option>
            <option :value="10">10 filas</option>
            <option :value="20">20 filas</option>
          </select>
        </div>
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
              <th scope="col" class="px-6 py-4">Usuario</th>
              <th scope="col" class="px-6 py-4">Cédula</th>
              <th scope="col" class="px-6 py-4">Rol Asignado</th>
              <th scope="col" class="px-6 py-4 text-center">Estado</th>
              <th scope="col" class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="u in usuariosPaginados"
              :key="u.id"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs ring-1 ring-slate-200">
                    {{ (u.nombres || u.email || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 text-sm">
                      {{ u.nombres }} {{ u.apellidos }}
                    </div>
                    <div class="text-slate-400 text-xs">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 inline-block">
                  {{ u.cedula?.valor || 'N/D' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs"
                  :class="rolBadgeClass(u.rol)"
                >
                  {{ u.rol }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
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
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    @click="abrirModalEditar(u)"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <svg class="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Editar</span>
                  </button>

                  <!-- Super Admin base protegido: botón de baja bloqueado -->
                  <span
                    v-if="esSuperAdmin(u.email) || esSuperAdmin(u.cedula?.valor)"
                    class="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg"
                    title="Este usuario es intocable"
                  >
                    Protegido
                  </span>
                  <button
                    v-else-if="u.activo"
                    type="button"
                    @click="confirmarBaja(u)"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <svg class="h-3.5 w-3.5 text-rose-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Dar de Baja</span>
                  </button>
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
      max-width="lg"
    >
      <form @submit.prevent="guardar" class="space-y-4">
        <div v-if="errorFormulario" class="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
          {{ errorFormulario }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>

        <InputBase
          v-model="formulario.email"
          label="Correo Electrónico"
          type="email"
          :disabled="esEdicion"
          required
          placeholder="usuario@cooperativa.ec"
        />

        <div class="space-y-1">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Cédula Ecuatoriana <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="formulario.cedula"
            :disabled="esEdicion"
            maxlength="10"
            required
            placeholder="1710034065"
            class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none font-mono transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
            :class="errorCedulaForm ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-blue-500'"
            @input="validarCedulaForm"
          />
          <p v-if="errorCedulaForm" class="text-xs font-semibold text-rose-600">
            {{ errorCedulaForm }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Rol del Sistema <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="formulario.rol"
            :disabled="esEdicion && (esSuperAdmin(formulario.email) || esSuperAdmin(formulario.cedula))"
            required
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
          >
            <option value="Administrador">Administrador</option>
            <option value="Oficinista">Oficinista</option>
            <option value="Chofer">Chofer</option>
            <option value="Usuario Final">Usuario Final / Cliente</option>
          </select>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            @click="modalAbierto = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando"
            class="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
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
import { useUsuarios } from '../Composables/useUsuarios'
import { Cedula } from '../../Domain/ValueObjects/Cedula'
import { RolUsuario } from '../../Domain/Constants/EstadosSistema'
import { esSuperAdmin } from '../../Domain/Constants/SuperAdmin'
import type { Usuario } from '../../Domain/Entities/Usuario'
import ButtonBase from '../Components/ButtonBase.vue'
import InputBase from '../Components/InputBase.vue'
import ModalBase from '../Components/ModalBase.vue'
import PaginationControls from '../Components/PaginationControls.vue'

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
} = useUsuarios()

onMounted(() => {
  cargarUsuarios()
})

// Modal y Formulario
const modalAbierto = ref(false)
const esEdicion = ref(false)
const guardando = ref(false)
const errorFormulario = ref<string | null>(null)
const errorCedulaForm = ref<string | null>(null)

const formulario = ref({
  id: '',
  nombres: '',
  apellidos: '',
  email: '',
  cedula: '',
  rol: RolUsuario.OFICINISTA as RolUsuario,
})

watch([busqueda, filtroRol, registrosPorPagina], () => {
  paginaActual.value = 1
})

function resetFiltros() {
  busqueda.value = ''
  filtroRol.value = 'Todos'
  paginaActual.value = 1
}

function validarCedulaForm() {
  if (formulario.value.cedula.length < 10) {
    errorCedulaForm.value = 'Deben ser 10 dígitos'
    return
  }
  if (!Cedula.validar(formulario.value.cedula)) {
    errorCedulaForm.value = 'Cédula inválida (Algoritmo Módulo 10)'
    return
  }
  errorCedulaForm.value = null
}

function abrirModalCrear() {
  esEdicion.value = false
  formulario.value = {
    id: '',
    nombres: '',
    apellidos: '',
    email: '',
    cedula: '',
    rol: RolUsuario.OFICINISTA,
  }
  errorFormulario.value = null
  errorCedulaForm.value = null
  modalAbierto.value = true
}

function abrirModalEditar(u: Usuario) {
  esEdicion.value = true
  formulario.value = {
    id: u.id || '',
    nombres: u.nombres,
    apellidos: u.apellidos,
    email: u.email,
    cedula: u.cedula?.valor || '',
    rol: u.rol,
  }
  errorFormulario.value = null
  errorCedulaForm.value = null
  modalAbierto.value = true
}

async function guardar() {
  errorFormulario.value = null

  if (!esEdicion.value) {
    validarCedulaForm()
    if (errorCedulaForm.value) {
      errorFormulario.value = 'Por favor ingresa una cédula válida.'
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
      })
    } else {
      await crear({
        email: formulario.value.email,
        cedula: formulario.value.cedula,
        nombres: formulario.value.nombres,
        apellidos: formulario.value.apellidos,
        rol: formulario.value.rol,
      })
    }
    modalAbierto.value = false
  } catch (err: any) {
    errorFormulario.value = err.message || 'Error al procesar la solicitud'
  } finally {
    guardando.value = false
  }
}

async function confirmarBaja(u: Usuario) {
  if (!u.id) return
  if (esSuperAdmin(u.email) || esSuperAdmin(u.cedula?.valor)) {
    window.alert('El usuario Super Administrador es un registro base del sistema y no puede ser dado de baja.')
    return
  }
  const confirmacion = window.confirm(`¿Confirmas dar de baja lógica al usuario ${u.nombres} ${u.apellidos}?`)
  if (confirmacion) {
    await desactivar(u.id)
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
