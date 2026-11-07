# Pago con tarjeta (Stripe + Supabase Edge Functions)

El navegador nunca maneja la llave secreta de Stripe. Las tres operaciones
sensibles viven en Edge Functions:

| Función | Propósito |
| --- | --- |
| `create-payment-intent` | Crea el `PaymentIntent` con el monto en centavos. |
| `verify-payment-intent` | Consulta estado, monto y moneda reales antes de emitir boletos. |
| `cancel-payment-intent` | Cancela un cobro pendiente o reembolsa un pago ya cobrado. |

## Flujo de compra online

1. `ProcesarCompraOnline` reserva la venta y los boletos (`Reservado`).
2. Se cobra con Stripe usando el total calculado en el servidor.
3. `ConfirmarCompra.confirmarReserva` verifica el `PaymentIntent` y compara
   monto/moneda con la venta.
4. Solo entonces la venta pasa a `AprobadaPago` y los boletos a `Emitido`.
5. Si algo falla después de reservar, se cancela la venta y se solicita el
   reembolso del pago.

## Configuración

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase functions deploy create-payment-intent
supabase functions deploy verify-payment-intent
supabase functions deploy cancel-payment-intent
```

Variables del frontend (`.env`):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Base de datos

Ejecuta `supabase/schema.sql` en el SQL Editor. Las migraciones finales son
idempotentes y agregan:

- `Ventas.StripePaymentIntentId` (único por pago).
- Método de pago `Tarjeta`.
- Datos de pasajero y descuento en `Boletos`.
- Índice único parcial `(RutaId, AsientoId)` para boletos activos, que evita
  dobles ventas del mismo asiento.
