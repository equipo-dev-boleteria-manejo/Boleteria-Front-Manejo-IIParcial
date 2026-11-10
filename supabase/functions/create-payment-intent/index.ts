// Edge Function: create-payment-intent
// Crea un PaymentIntent de Stripe. La llave secreta vive solo en Supabase.
import Stripe from 'npm:stripe@17.4.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MONEDAS_PERMITIDAS = ['usd'];
const MONTO_MINIMO_CENTAVOS = 50;
const MONTO_MAXIMO_CENTAVOS = 5_000_000;

interface SolicitudPago {
  amount?: unknown;
  currency?: unknown;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }

  const llave = Deno.env.get('STRIPE_SECRET_KEY');
  if (!llave) {
    return json({ error: 'STRIPE_SECRET_KEY no está configurada.' }, 500);
  }

  let solicitud: SolicitudPago;
  try {
    solicitud = (await req.json()) as SolicitudPago;
  } catch {
    return json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, 400);
  }

  const amount = Number(solicitud.amount);
  if (
    !Number.isInteger(amount) ||
    amount < MONTO_MINIMO_CENTAVOS ||
    amount > MONTO_MAXIMO_CENTAVOS
  ) {
    return json({ error: 'El monto enviado no es válido.' }, 400);
  }

  const currency = String(solicitud.currency ?? 'usd').toLowerCase();
  if (!MONEDAS_PERMITIDAS.includes(currency)) {
    return json({ error: 'La moneda enviada no está permitida.' }, 400);
  }

  try {
    const stripe = new Stripe(llave, { apiVersion: '2024-12-18.acacia' });
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { origen: 'boleteria-web' },
    });

    return json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error ? error.message : 'Error desconocido de Stripe.';
    return json({ error: `No se pudo crear el pago: ${mensaje}` }, 502);
  }
});
