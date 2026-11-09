# Especificación de Implementación: Rol Encargado de Cooperativa

Este documento detalla la arquitectura, alcance funcional, componentes de interfaz y pasos técnicos necesarios para implementar el rol **Encargado de Cooperativa** en el sistema de boletería interprovincial.

---

## 1. Responsabilidad y Propósito del Rol

El **Encargado de Cooperativa** es el responsable administrativo y operativo directo de una cooperativa de transporte específica asignada por el Administrador.

* **Ámbito de control:** Limitado estrictamente a su `cooperativaId`. No tiene acceso a datos de otras cooperativas ni a la administración global del sistema.
* **Misión principal:**
  1. Gestionar la identidad institucional y marca de su cooperativa.
  2. Registrar, mantener y monitorear la flota de buses de su cooperativa.
  3. Crear y configurar las frecuencias aprobadas por la ANT (Agencia Nacional de Tránsito).

---

## 2. Requerimientos Funcionales Específicos

### 2.1 Configuración Institucional de la Cooperativa
* **Datos Generales:**
  * Nombre legal y Comercial.
  * RUC (Registro Único de Contribuyentes).
  * Teléfonos y canal directo de soporte / WhatsApp para pasajeros.
  * Enlaces a redes sociales oficiales (Facebook, Instagram, X/Twitter).
* **Identidad Visual:**
  * Subida y almacenamiento de logotipo oficial (`storage/cooperativas/logos`).
  * Selector de color primario y secundario (hexadecimales) para personalización de boletos y cabeceras.

### 2.2 Gestión de Flota y Buses
* **Registro de Unidades:**
  * Número de disco interno (ej. Disco 14).
  * Placa vehicular oficial (formato ecuatoriano).
  * Número de chasis y modelo/marca del bus.
  * Capacidad total de asientos y distribución de pisos (Piso 1, Piso 2).
  * Tipología de asientos por defecto: Clásicos vs. VIP.
* **Control de Estado:**
  * Cambio de estado de unidad: `Activo`, `En Mantenimiento`, `Inactivo`.

### 2.3 Creación y Asignación de Frecuencias ANT
* **Definición de Itinerarios Oficiales:**
  * Terminal de Origen y Terminal de Destino Final.
  * Hora de salida aprobada por la resolución ANT.
  * Tarifa base y duración estimada de viaje.
  * Días u horarios en los que aplica la frecuencia.
* **Asignación de Buses a Frecuencias:**
  * Vinculación de una unidad operativa de la flota a la frecuencia correspondiente.

---

## 3. Plan de Implementación Técnica (Frontend)

### 3.1 Capa de Dominio y Repositorios
1. **Entidad `Cooperativa`:**
   * Garantizar que la entidad contenga: `id`, `nombre`, `ruc`, `logoUrl`, `colorPrimario`, `colorSecundario`, `telefonoSoporte`, `redesSociales`.
2. **Contrato de Repositorio:**
   * `ICooperativaRepository.ts`:
     * `obtenerPorId(id: number): Promise<Cooperativa>`
     * `actualizarConfiguracion(id: number, datos: Partial<Cooperativa>): Promise<void>`
     * `subirLogo(id: number, archivo: File): Promise<string>`

### 3.2 Capa de Aplicación (Casos de Uso)
* `ActualizarPerfilCooperativa.ts`: Valida RUC y formato de colores antes de persistir.
* `GestionarFlotaEncargado.ts`: Listado y filtrado de buses pertenecientes únicamente al `cooperativaId` de la sesión.
* `GestionarFrecuenciasEncargado.ts`: Creación y edición de frecuencias acotadas a la cooperativa.

### 3.3 Capa de Presentación (Vistas y Componentes)

#### Nuevas Vistas sugeridas:
1. `src/Presentation/Views/encargado/PerfilCooperativa.vue`:
   * Formulario con previsualización del logo y paleta de colores.
   * Campos para RUC, teléfonos de atención al cliente y redes sociales.
2. `src/Presentation/Views/encargado/MisBuses.vue`:
   * Reutilización o adaptación de `BusesAdmin.vue`, pero filtrando automáticamente por la cooperativa del usuario en sesión.
3. `src/Presentation/Views/encargado/MisFrecuencias.vue`:
   * Configuración de salidas oficiales según resolución ANT.

#### Modificación del Router (`src/Presentation/router/index.ts`):
Agregar la constante de rol y habilitar las rutas:
```typescript
const ENCARGADO = ['encargado'];

// Rutas con acceso para el encargado:
{
  path: '/cooperativa/perfil',
  name: 'PerfilCooperativa',
  component: () => import('../Views/encargado/PerfilCooperativa.vue'),
  meta: { roles: ENCARGADO },
},
{
  path: '/cooperativa/buses',
  name: 'BusesCooperativa',
  component: () => import('../Views/encargado/MisBuses.vue'),
  meta: { roles: ENCARGADO },
},
{
  path: '/cooperativa/frecuencias',
  name: 'FrecuenciasCooperativa',
  component: () => import('../Views/encargado/MisFrecuencias.vue'),
  meta: { roles: ENCARGADO },
}
```

#### Modificación del Menú (`src/Presentation/Components/AppLayout.vue`):
Añadir ítems visibles condicionados a `ENCARGADO`:
* **Mi Cooperativa:** Configuración institucional (RUC, logo, redes).
* **Flota de Buses:** Gestión de unidades y mantenimiento.
* **Frecuencias ANT:** Programación de itinerarios aprobados.
* **Dashboard:** Vista adaptada de métricas con las ventas e índices de ocupación de su cooperativa.

---

## 4. Matriz de Control de Acceso (RBAC)

| Módulo / Acción | Admin | Encargado | Oficinista | Chofer | Cliente |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Crear Cooperativas y Asignar Encargados | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configurar Logo, RUC y Redes Sociales | ✅ | ✅ (Su Coop) | ❌ | ❌ | ❌ |
| Crear y Modificar Buses | ✅ | ✅ (Su Coop) | ❌ | ❌ | ❌ |
| Crear Frecuencias ANT | ✅ | ✅ (Su Coop) | ❌ | ❌ | ❌ |
| Venta en Ventanilla (Efectivo) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Aprobar Pagos / Comprobantes | ✅ | ❌ | ✅ | ❌ | ❌ |
| Validar Abordaje (Lectura QR) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Comprar Boletos en Línea | ❌ | ❌ | ❌ | ❌ | ✅ |
