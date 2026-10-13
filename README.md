# Boletería Front - Sistema de Venta de Pasajes Interprovinciales

[![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.2-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sistema web frontend para la gestión integral y venta de pasajes de transporte terrestre interprovincial en Ecuador, enfocado en cooperativas de transporte, gestión de frecuencias, validación de comprobantes de pago y emisión de boletos digitales.

---

## 1. Visión General del Proyecto

En el contexto del transporte terrestre ecuatoriano, las cooperativas manejan rutas asignadas oficialmente como **frecuencias** (origen, destino, hora aprobada). El sistema centraliza la operativa entre cooperativas, terminales y usuarios finales permitiendo:
* Compra anticipada de pasajes (hasta con 1 mes de anticipación).
* Selección de asientos por tipo (Clásico y VIP) con distribución gráfica del bus.
* Descuentos preferenciales por ley (tercera edad, personas con discapacidad y menores de edad).
* Métodos de pago flexibles: efectivo en ventanilla, transferencia y depósito bancario con subida y validación de comprobantes.
* Estados de boleto claros: `Reservado`, `En proceso de validación`, `Aprobado`.
* Validación de abordaje de pasajeros mediante lectura de códigos QR.

---

## 2. Roles del Sistema

* **Administrador:** Registra cooperativas en la plataforma y designa a los encargados.
* **Encargado de Cooperativa:** Gestiona la identidad de la cooperativa (logo, colores institucionales, redes sociales, RUC, soporte), buses y asignación de frecuencias aprobadas.
* **Oficinista:** Venta directa en terminal (efectivo) y aprobación/rechazo de comprobantes de pago digitales para confirmar reservas.
* **Chofer:** Visualización de la hoja de ruta, lista de pasajeros (abordados en verde / pendientes en gris), validación de QR y control de tiempos de viaje.
* **Cliente:** Búsqueda de rutas, reserva de asientos, carga de comprobantes y consulta de boletos digitales adquiridos.

---

## 3. Arquitectura del Software

El proyecto implementa una **Arquitectura Limpia / Hexagonal (Clean Architecture)** orientada al desacoplamiento de capas y mantenibilidad:

```
src/
├── Application/        # Casos de uso y reglas de aplicación
├── Domain/             # Entidades de negocio, tipos y contratos
├── Infrastructure/     # Clientes externos (Supabase, APIs HTTP, Storage)
├── Presentation/       # Componentes Vue, Vistas, Router y Stores Pinia
│   ├── Components/
│   ├── router/
│   ├── Store/
│   └── Views/
│       ├── admin/
│       ├── chofer/
│       ├── cliente/
│       ├── oficinista/
│       └── reportes/
└── utils/              # Funciones auxiliares y formateadores
```

---

## 4. Flujo de Trabajo de Git: Justificación de GitFlow

Para este proyecto se implementó el modelo **GitFlow** conforme a las especificaciones de la materia (Unidad 2.2 - Git):
* **Aislamiento de producción:** La rama `main` refleja únicamente versiones estables liberadas y verificadas.
* **Integración continua organizada:** La rama `develop` centraliza el trabajo activo y las pruebas del equipo antes de generar un release.
* **Trazabilidad estricta y auditoría:** Se aplica la regla de **no borrar ramas**, garantizando que el historial completo de cada `feature/*`, `release/*` y `hotfix/*` quede registrado.
* **Control de Cambios (CCB):** Ningún cambio ingresa a `develop` sin un Issue previo aprobado por el comité y un Pull Request con directivas formales de cierre (`Closes #XX`).

Consulta todos los detalles en la [Guía de Contribución](CONTRIBUTING.md).

---

## 5. Instalación y Ejecución Local

### Prerrequisitos
* Node.js >= 20.x
* npm >= 10.x

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/equipo-dev-boleteria-manejo/Boleteria-Front-Manejo-IIParcial.git

# 2. Entrar a la carpeta
cd Boleteria-Front-Manejo-IIParcial

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
cp .env.example .env

# 5. Iniciar servidor de desarrollo
npm run dev
```

---

## 6. Documentación del Repositorio

1. [README.md](README.md) - Documentación principal y visión del sistema.
2. [CONTRIBUTING.md](CONTRIBUTING.md) - Normas de contribución, GitFlow y Conventional Commits.
3. [LICENSE](LICENSE) - Licencia MIT del software.
4. [SECURITY.md](SECURITY.md) - Política y protocolo de reporte de vulnerabilidades.
5. [CITATION.cff](CITATION.cff) - Formato de citación académica del repositorio.