# Política de Seguridad (Security Policy)

Este documento detalla las directrices de seguridad y el procedimiento formal para reportar vulnerabilidades en el sistema de **Boletería Front**.

## 1. Versiones Soportadas

Actualmente, solo las versiones activas del ciclo de desarrollo del segundo parcial reciben parches de seguridad y correcciones.

| Versión | Soportada          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## 2. Reporte de Vulnerabilidades

Nos tomamos muy en serio la seguridad de los datos de los usuarios, cooperativas y transacciones de boletos.

Si descubres una vulnerabilidad de seguridad o brecha en la aplicación:

1. **NO abras un Issue público:** Para evitar exponer la vulnerabilidad antes de que sea subsanada, no crees un issue abierto con detalles sensibles o exploits.
2. **Canal de Comunicación:** Envía un reporte detallado al equipo de seguridad / comité de control de cambios o contacta a los mantenedores designados del repositorio.
3. **Contenido del reporte:**
   - Descripción clara y concisa de la vulnerabilidad.
   - Pasos para reproducirla (Proof of Concept / PoC).
   - Componentes, vistas o rutas afectadas (e.g., inyección, exposición de comprobantes, bypass de validación).
   - Impacto estimado sobre la confidencialidad, integridad o disponibilidad del sistema.

## 3. Proceso de Respuesta y Mitigación

Una vez recibido el reporte:
- El **Comité de Control de Cambios (CCB)** evaluará la severidad de la incidencia.
- Se creará una rama `hotfix/<nombre>` a partir de `main` siguiendo el flujo **GitFlow**.
- Se aplicará el parche, se verificarán las pruebas y se fusionará tanto en `main` como en `develop`.
- Se liberará un tag de versión correctiva bajo SemVer (e.g., `v0.1.1`).
