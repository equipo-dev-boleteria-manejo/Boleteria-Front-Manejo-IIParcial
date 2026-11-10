# 📘 Guía Oficial de Componentes Reutilizables y Pruebas Manuales de Vistas

Esta guía establece el **estándar obligatorio de interfaz y control de calidad** para todos los integrantes del equipo en el proyecto **Boletería Front**.

---

## 🎯 1. ¿Por qué es OBLIGATORIO usar estos componentes?

1. **Coherencia Visual y Experiencia de Usuario (UI/UX)**:
   No podemos tener botones con diferentes colores, modales con tipografías distintas o tablas con espaciados dispares. La plataforma debe verse como un producto profesional único, no como parches de diferentes desarrolladores.
2. **Ahorro de Tiempo y Productividad**:
   Ya no necesitas diseñar tablas, modales, barras de búsqueda ni validar estilos CSS desde cero. Solo importas el componente, le pasas las propiedades (`props`) y conectas tu caso de uso.
3. **Desacoplamiento Arquitectónico (SOLID & Clean Architecture)**:
   - Los archivos `.vue` de la capa de presentación son **únicamente la plantilla de maquetación**.
   - **Toda la lógica de validación, cálculos y estados debe estar fuera del `.vue`** en **composables independientes** (`src/Presentation/Composables/`).

---

## 🧩 2. Catálogo de Componentes Transversales

Todos los componentes se encuentran en `src/Presentation/Components/`.

### 2.1 Tarjetas de Métricas / KPIs (`MetricCard.vue`)
Se ubican siempre en la parte superior de la vista para resumir las cifras clave del módulo.

```html
<script setup lang="ts">
import MetricCard from '@/Presentation/Components/MetricCard.vue';

const tarjetas = [
  { etiqueta: 'Total Frecuencias', valor: 24, detalle: 'Frecuencias registradas', icono: '🕒', variant: 'default' },
  { etiqueta: 'Activas', valor: 20, detalle: 'Operando en terminal', icono: '✅', variant: 'success' },
  { etiqueta: 'Suspendidas', valor: 4, detalle: 'Fuera de horario temporal', icono: '⛔', variant: 'danger' },
  { etiqueta: 'En Contingencia', valor: 1, detalle: 'Rutas alternativas activas', icono: '🛠️', variant: 'warning' },
];
</script>

<template>
  <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <MetricCard
      v-for="t in tarjetas"
      :key="t.etiqueta"
      :title="t.etiqueta"
      :value="t.valor"
      :icon="t.icono"
      :description="t.detalle"
      :variant="t.variant"
    />
  </section>
</template>
```
* **Variantes permitidas**: `'default'` (azul), `'success'` (verde), `'warning'` (ámbar), `'danger'` (rojo).

---

### 2.2 Barra de Búsqueda y Filtros Unificada
Agrupa en un solo contenedor la búsqueda reactiva, los selectores de filtro y los botones de acción.

```html
<script setup lang="ts">
import SearchInput from '@/Presentation/Components/SearchInput.vue';
import SelectFilter from '@/Presentation/Components/SelectFilter.vue';
import RefreshButton from '@/Presentation/Components/RefreshButton.vue';
import CreateButton from '@/Presentation/Components/CreateButton.vue';

const busqueda = ref('');
const filtroTipo = ref('Todos');
const cargando = ref(false);

const opciones = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Directo', label: 'Directo' },
  { value: 'Intermedio', label: 'Intermedio' }
];

function recargar() { /* ... */ }
function abrirCrear() { /* ... */ }
</script>

<template>
  <div class="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
    <div class="w-full md:w-80">
      <SearchInput
        v-model="busqueda"
        placeholder="Buscar por origen, destino o código..."
      />
    </div>

    <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
      <SelectFilter
        label="Tipo:"
        v-model="filtroTipo"
        :options="opciones"
      />

      <RefreshButton
        :loading="cargando"
        @click="recargar"
      />

      <CreateButton
        label="Registrar Frecuencia"
        @click="abrirCrear"
      />
    </div>
  </div>
</template>
```

---

### 2.3 Botones de Acción en Tablas (`ActionButton.vue`)
Estandariza los botones interactivos de cada fila con iconos SVG, estados `loading` y colores corporativos.

```html
<script setup lang="ts">
import ActionButton from '@/Presentation/Components/ActionButton.vue';
</script>

<template>
  <div class="flex items-center justify-end gap-2">
    <!-- Editar -->
    <ActionButton action="edit" @click="editarItem(item)" />

    <!-- Alerta / Incidente -->
    <ActionButton action="warning" label="Incidente" @click="reportar(item)" />

    <!-- Dar de baja / Eliminar -->
    <ActionButton action="danger" label="Dar de Baja" @click="darDeBaja(item)" />

    <!-- Activar -->
    <ActionButton action="success" label="Activar" @click="activar(item)" />

    <!-- Reactivar -->
    <ActionButton action="primary" label="Reactivar" @click="reactivar(item)" />
  </div>
</template>
```

---

### 2.4 Modal Base Desacoplado (`ModalBase.vue`)
Elimina el uso de scrolls dobles o títulos desordenados. Brinda un encabezado con gradiente, título en mayúsculas y botón de cierre accesible.

```html
<template>
  <ModalBase
    v-model="modalAbierto"
    title="REGISTRAR NUEVA FRECUENCIA"
    max-width="2xl"
    @close="modalAbierto = false"
  >
    <form id="form-frecuencia" @submit.prevent="guardar" class="space-y-4">
      <InputBase
        v-model="form.origen"
        label="Ciudad de Origen"
        placeholder="Ej. Ambato"
        required
        :error="errorOrigen"
      />
      <!-- Resto de campos -->
    </form>

    <template #footer>
      <ButtonBase variant="secondary" @click="modalAbierto = false">Cancelar</ButtonBase>
      <ButtonBase type="submit" form="form-frecuencia" :loading="guardando">Guardar Frecuencia</ButtonBase>
    </template>
  </ModalBase>
</template>
```

---

### 2.5 Sistema Unificado de Feedback (`useFeedback.ts`)
**PROHIBIDO usar `alert()` nativo de Javascript o crear banners de éxito dentro de la tabla.**
Todo el feedback debe emitirse a través del composable `useFeedback()`:

```ts
import { useFeedback } from '@/Presentation/Composables/useFeedback';

const { showSuccess, showError, showWarning, confirm } = useFeedback();

// 1. Mensaje de éxito (Toast flotante arriba a la derecha, dura 3 segundos):
showSuccess('Frecuencia creada exitosamente.');

// 2. Mensaje de error:
showError('No se pudo conectar con el servidor.');

// 3. Confirmación de seguridad antes de una acción destructiva:
const confirmado = await confirm({
  title: 'Dar de baja frecuencia',
  message: '¿Está seguro de suspender esta frecuencia? Dejará de venderse en ventanilla.',
  confirmText: 'Confirmar suspensión',
  type: 'warning',
});

if (confirmado) {
  // Ejecutar caso de uso...
}
```

---

## 🧪 3. Protocolo Obligatorio de Pruebas Manuales para Cada Integrante

Antes de marcar una vista o tarea como terminada, **cada integrante DEBE realizar y documentar manualmente las siguientes pruebas en el navegador** (`http://localhost:5173`):

### 📋 Checklist de Pruebas Manuales

#### 1. Prueba de Flujo Feliz (Creación exitosa)
- [ ] Abrir el modal con `CreateButton`.
- [ ] Ingresar datos válidos en todos los campos requeridos.
- [ ] Pulsar el botón de guardar.
- [ ] **Resultado esperado**:
  - El modal se cierra automáticamente.
  - Aparece el **Toast verde en la esquina superior derecha** con mensaje explicativo durante 3 segundos.
  - El nuevo registro aparece reflejado inmediatamente en la tabla sin necesidad de recargar la página manualmente con F5.

#### 2. Prueba de Validaciones y Campos Inválidos
- [ ] Intentar enviar el formulario completamente vacío.
- [ ] **Resultado esperado**: Los campos requeridos deben marcarse en rojo con su mensaje de error debajo. El formulario NO se debe enviar.
- [ ] Ingresar formatos erróneos (ej. cédula con 9 dígitos, placa con letras no provinciales, capacidades con números negativos o letras).
- [ ] **Resultado esperado**: El composable de validación debe detectar el error en tiempo real y bloquear el botón de envío.

#### 3. Prueba de Búsqueda y Filtros
- [ ] Escribir en `SearchInput` palabras clave en mayúsculas, minúsculas y términos parciales.
- [ ] Cambiar las opciones de los `SelectFilter`.
- [ ] **Resultado esperado**: La tabla debe filtrar reactivamente sin demoras. Si no hay coincidencias, debe mostrar el estado vacío elegante con el botón de "Restablecer Filtros".

#### 4. Prueba de Edición
- [ ] Hacer clic en el botón `Editar` de cualquier fila.
- [ ] **Resultado esperado**: El modal abre con los datos precargados del registro seleccionado.
- [ ] Modificar uno de los valores válidos y guardar.
- [ ] **Resultado esperado**: Se notifica con el Toast de éxito y la tabla se actualiza al instante con los nuevos valores.

#### 5. Prueba de Confirmación y Cambio de Estado
- [ ] Hacer clic en `Desactivar`, `Dar de Baja` o `Incidente`.
- [ ] **Resultado esperado**: Se abre el **Modal de Confirmación** (`useFeedback().confirm()`).
- [ ] Si se presiona **Cancelar**, la acción no se ejecuta y el estado permanece intacto.
- [ ] Si se presiona **Confirmar**, se ejecuta la acción, cambia el estado visual del badge en la tabla y se muestra el toast de éxito.

#### 6. Prueba Visual y Libre de Desbordamientos (Zero Scroll)
- [ ] Abrir los modales en pantalla completa y en ventana reducida.
- [ ] **Resultado esperado**: Todo el formulario debe verse visible y cómodo. No deben existir barras de scroll verticales innecesarias dentro del modal si hay espacio disponible.
- [ ] Tipografías uniformes: textos de encabezado en blanco sobre gradiente, textos de cuerpo en escala gris/slate legible.

---

## 🚀 4. Flujo de Git para Subir tu Módulo

Siguiendo el estándar de **GitFlow Adaptado** (`CONTRIBUTING.md`):

1. Asegúrate de compilar y correr los tests antes de hacer commit:
   ```bash
   npm run build
   npm run test
   ```
2. Realiza commits atómicos bajo **Conventional Commits**:
   ```bash
   git add .
   git commit -m "feat(frecuencias): implement frecuencias view with reusable design system"
   ```
3. Sube tu rama al repositorio remoto:
   ```bash
   git push origin feature/tu-rama
   ```
4. Abre el Pull Request hacia la rama `develop` detallando las pruebas manuales ejecutadas.
