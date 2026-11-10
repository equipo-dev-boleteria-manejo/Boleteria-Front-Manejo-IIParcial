# Pruebas manuales - vistas de venta de boletos

Este documento describe cómo sembrar datos persistentes en Supabase y cómo validar
manualmente las cuatro vistas asignadas:

| Vista | Ruta | Rol |
| --- | --- | --- |
| `BuscarRutas.vue` | `/cliente/comprar-boleto` o `/buscar` | cliente |
| `MisBoletos.vue` | `/cliente/mis-boletos` o `/mis-boletos` | cliente |
| `AprobarPago.vue` | `/oficinista/aprobar-pagos` | oficinista / admin |
| `VentaBoletos.vue` | `/oficinista/venta-boletos` | oficinista / admin |

Los datos se guardan realmente en las tablas de Supabase. No se usan mocks del
frontend.

---

## 1. Preparación

1. Aplicar `supabase/schema.sql` en el proyecto de Supabase si aún no está aplicado.
2. Crear el archivo `.env` a partir de `.env.example` y completar:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...

   # Solo para el script de seed. No usar el prefijo VITE_.
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ```

   La `service_role key` está en **Supabase > Settings > API**. Es necesaria para
   crear usuarios confirmados en Supabase Auth.

3. Ejecutar el seed:

   ```bash
   npm run seed:test
   ```

   El script es idempotente: elimina primero los registros demo (marcados con el
   RUC `1799999999001`, las placas `TST-001` / `TST-002`, las frecuencias
   `TEST-*` y los correos `@boleteria-demo.com`) y luego los vuelve a crear.
   No toca datos reales del proyecto.

4. Iniciar la aplicación:

   ```bash
   npm run dev
   ```

> Si se aprueba o rechaza una venta durante la prueba, los datos cambian. Para
> volver al escenario inicial basta con ejecutar otra vez `npm run seed:test`.

---

## 2. Cuentas demo

Todas usan la contraseña **`Demo1234!`**.

| Rol | Correo | Cédula |
| --- | --- | --- |
| cliente | `cliente.demo@boleteria-demo.com` | `1712345675` |
| cliente (otro pasajero) | `cliente2.demo@boleteria-demo.com` | `1712345717` |
| oficinista | `oficinista.demo@boleteria-demo.com` | `1712345683` |
| admin | `admin.demo@boleteria-demo.com` | `1712345691` |
| chofer | `chofer.demo@boleteria-demo.com` | `1712345709` |

Cédulas adicionales usadas solo como pasajeros en boletos:

`1712345725`, `1712345733`, `1712345741`, `0912345675`, `0102345675`.

---

## 3. Escenario sembrado

Todas las fechas son relativas al día en que se ejecuta el seed.

| Ruta | Frecuencia | Fecha | Hora | Bus | Estado | ¿Visible en venta? |
| --- | --- | --- | --- | --- | --- | --- |
| `r1` | Quito → Guayaquil `TEST-UIO-GYE-0700` | hoy | 07:00 | `TST-001` (40 asientos, un piso) | Programada | Sí |
| `r2` | Quito → Guayaquil `TEST-UIO-GYE-0700` | mañana | 07:00 | `TST-001` | Programada | Sí |
| `r3` | Quito → Guayaquil `TEST-UIO-GYE-1430` | +2 días | 14:30 | `TST-002` (48 asientos, dos pisos) | Programada | Sí |
| `r4` | Guayaquil → Quito `TEST-GYE-UIO-0800` | hoy | 08:00 | `TST-002` | EnCurso | Sí |
| `r5` | Quito → Cuenca `TEST-UIO-CUE-0900` | +3 días | 09:00 | `TST-002` | Programada | Sí |
| `r6` | Quito → Ambato `TEST-UIO-AMB-0630` | mañana | 06:30 | `TST-001` | Programada | **No** (frecuencia inactiva) |
| `r7` | Quito → Guayaquil `TEST-UIO-GYE-0700` | -2 días | 07:00 | `TST-001` | Finalizada | **No** (historial) |
| `r8` | Quito → Guayaquil `TEST-UIO-GYE-1430` | +4 días | 14:30 | `TST-001` | Cancelada | **No** |
| `r9` | Guayaquil → Quito `TEST-GYE-UIO-0800` | +5 días | 08:00 | `TST-001` | Programada | Sí |

Ventas y boletos sembrados:

| Venta | Ruta | Estado venta | Método | Comprobante | Boletos | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Pendiente con comprobante | `r2` | Pendiente | Transferencia | Sí | 2 en `Proceso de validacion` | $25.00 |
| Tarjeta aprobada | `r3` | AprobadaPago | Tarjeta | No | 2 en `Emitido` | $30.00 |
| Historial aprobado | `r7` | AprobadaPago | Transferencia | Sí | 1 `Abordado` + 1 `Emitido` | $30.00 |
| Cancelada | `r2` | Cancelada | Transferencia | Sí | 1 en `Cancelado` | $10.00 |
| Pendiente sin comprobante | `r2` | Pendiente | Transferencia | **No** | 2 en `Proceso de validacion` | $20.00 |
| Otro pasajero aprobada | `r3` | AprobadaPago | Efectivo | `PAGO_DIRECTO` | 2 en `Emitido` | $25.00 |

Los asientos ocupados en el mapa son:

- Ruta `r2` (bus `TST-001`): asientos **10, 11** (venta pendiente) y **20, 21**
  (venta pendiente sin comprobante). El asiento **15** pertenece a la venta
  cancelada, por lo que debe verse **libre**.
- Ruta `r3` (bus `TST-002`): asientos **1, 2** (tarjeta aprobada) y **10, 11**
  (otro pasajero).
- Ruta `r7`: asientos **5, 6** (historial).

---

## 4. BuscarRutas.vue (cliente)

1. Iniciar sesión con `cliente.demo@boleteria-demo.com` / `Demo1234!`.
2. Entrar a `/cliente/comprar-boleto` (o `/buscar`).
3. Sin filtros, verificar que se listen las rutas de hoy y futuras:
   - Quito → Guayaquil 07:00 de hoy.
   - Guayaquil → Quito 08:00 de hoy (estado `EnCurso`).
   - Quito → Guayaquil 07:00 de mañana.
   - Quito → Guayaquil 14:30 a +2 días (bus de dos pisos).
   - Quito → Cuenca 09:00 a +3 días.
4. Verificar que **no** aparezcan:
   - Quito → Ambato (frecuencia inactiva).
   - La ruta finalizada de hace 2 días.
   - La ruta cancelada de +4 días.
5. Escribir `Quito` en Origen y `Guayaquil` en Destino, y probar la fecha de
   mañana: debe aparecer la ruta de `r2`.
6. Seleccionar la ruta de mañana y abrir el mapa de asientos:
   - Los asientos **10, 11, 20 y 21** deben aparecer ocupados.
   - El asiento **15** debe aparecer libre (la venta cancelada liberó el asiento).
7. Seleccionar un asiento libre, completar los datos del pasajero y confirmar
   una compra por **Transferencia** adjuntando una imagen o PDF:
   - Debe mostrarse el modal de comprobante con los códigos QR / barras.
   - La venta debe quedar `Pendiente` y el boleto en `Proceso de validacion`.
8. Opcional (requiere Stripe configurado): repetir la compra con **Tarjeta** y
   verificar que el boleto quede `Emitido` solo si el pago se confirma.

**Criterio de aceptación:** las rutas activas se muestran, las inactivas /
canceladas / finalizadas se ocultan, y la ocupación refleja los boletos de la
base de datos.

---

## 5. MisBoletos.vue (cliente)

1. Iniciar sesión con `cliente.demo@boleteria-demo.com`.
2. Entrar a `/cliente/mis-boletos` (o `/mis-boletos`).
3. Confirmar que el campo cédula se llena automáticamente con `1712345675` y que
   se listan **4 compras**:
   - Venta pendiente por transferencia (2 boletos en `Proceso de validacion`,
     total $25.00).
   - Venta con tarjeta aprobada (2 boletos `Emitido`, total $30.00).
   - Venta cancelada (1 boleto `Cancelado`, total $10.00).
   - Venta histórica en ruta finalizada (1 `Abordado` + 1 `Emitido`, grupo con
     estado `Estados variados`, total $30.00).
4. Verificar que **no** aparezcan los boletos de `cliente2`
   (cédula `1712345717`), que suman 2 compras: una pendiente sin comprobante y
   una aprobada en efectivo.
5. Consultar manualmente la cédula `1712345717` en el buscador:
   - Deben aparecer esas 2 compras de `cliente2`.
6. Volver a `1712345675`, abrir **Ver comprobante** en una compra y comprobar
   que el modal muestra pasajeros, asientos, total y códigos QR / barras.
7. Usar **Imprimir** en el modal (opcional) y validar que no haya errores.

**Criterio de aceptación:** el historial se filtra por la cédula del pasajero,
los estados y totales coinciden con la base de datos y el comprobante se genera
sin errores.

---

## 6. AprobarPago.vue (oficinista)

1. Cerrar sesión e iniciar con `oficinista.demo@boleteria-demo.com` /
   `Demo1234!`.
2. Entrar a `/oficinista/aprobar-pagos`.
3. Verificar que se listen **2 ventas pendientes**:
   - Una **con comprobante** (total $25.00): la aprobación debe estar habilitada.
   - Una **sin comprobante** (total $20.00): la aprobación debe estar
     deshabilitada y debe mostrarse el mensaje de que no puede aprobarse.
4. Abrir la venta con comprobante:
   - Verificar que el enlace del comprobante abre en otra pestaña.
   - Verificar que se listen los 2 boletos de la venta.
   - Aprobar el pago: debe mostrarse el mensaje de éxito y la venta debe
     desaparecer de la lista.
5. Iniciar sesión como cliente y entrar a MisBoletos: los boletos de esa venta
   deben haber pasado a `Emitido`.
6. Volver a ejecutar `npm run seed:test` para restaurar los datos.
7. Repetir el flujo con la venta que sí tiene comprobante, pero esta vez
   **Rechazar** indicando una observación:
   - La venta debe desaparecer de pendientes.
   - Los boletos deben quedar `Cancelado` y el asiento debe liberarse en
     BuscarRutas.
8. Intentar aprobar la venta sin comprobante: la acción debe impedirse tanto en
   la interfaz como en el caso de uso.

**Criterio de aceptación:** solo se aprueban ventas pendientes con comprobante y
boletos; aprobar emite los boletos y rechazar los cancela.

---

## 7. VentaBoletos.vue (oficinista)

1. Iniciar sesión con `oficinista.demo@boleteria-demo.com` (o con
   `admin.demo@boleteria-demo.com`).
2. Entrar a `/oficinista/venta-boletos`.
3. Verificar el control de acceso: al iniciar sesión como `cliente`, la ruta no
   debe ser accesible para ese rol.
4. Sin filtros, confirmar que se ven las mismas rutas activas que en
   BuscarRutas y que no aparecen las rutas inactivas / canceladas /
   finalizadas.
5. Seleccionar una ruta y abrir el mapa:
   - En la ruta de mañana deben verse ocupados los asientos 10, 11, 20 y 21.
   - En la ruta de +2 días deben verse ocupados los asientos 1, 2, 10 y 11.
6. Realizar una venta en efectivo:
   - Elegir uno o dos asientos libres.
   - Completar datos con una cédula válida, por ejemplo `1713456786`,
     `1714567896` o `1712345725`.
   - Confirmar la venta y verificar el modal de comprobante.
   - Buscar la cédula del pasajero en MisBoletos: el boleto debe aparecer en
     estado `Emitido`.
7. Verificar descuentos (opcional):
   - Pasajero menor de edad: 30 % de descuento.
   - Pasajero con discapacidad o tercera edad: 50 % de descuento.
8. Confirmar que el total mostrado en la venta coincide con la suma de las
   tarifas de los asientos y descuentos.

**Criterio de aceptación:** un oficinista o admin puede emitir boletos en
efectivo, los precios se resuelven con las tarifas del servidor y los boletos
quedan persistidos y visibles en MisBoletos.

---

## 8. Checklist rápido

- [ ] `npm run seed:test` termina sin errores y muestra el resumen de cuentas.
- [ ] Las 5 cuentas demo pueden iniciar sesión con `Demo1234!`.
- [ ] BuscarRutas muestra solo rutas vendibles y la ocupación correcta.
- [ ] MisBoletos filtra por cédula y muestra los 4 grupos del cliente demo.
- [ ] AprobarPago lista 2 pendientes y bloquea la que no tiene comprobante.
- [ ] Aprobar emite boletos; rechazar los cancela y libera el asiento.
- [ ] VentaBoletos permite vender en efectivo y el boleto aparece en MisBoletos.
- [ ] `npm test` y `npm run build` continúan pasando después de los cambios.
