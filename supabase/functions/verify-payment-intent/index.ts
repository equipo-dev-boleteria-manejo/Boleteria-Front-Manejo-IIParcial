// Edge Function: verify-payment-intent
// Devuelve el estado real del PaymentIntent para validarlo antes de emitir boletos.
import Stripe from 'npm:stripe@17.4.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SolicitudVerificacion {
  paymentIntentId?: unknown;
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

  let solicitud: SolicitudVerificacion;
  try {
    solicitud = (await req.json()) as SolicitudVerificacion;
  } catch {
    return json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, 400);
  }

  const paymentIntentId = String(solicitud.paymentIntentId ?? '').trim();
  if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    return json({ error: 'El identificador de pago no es válido.' }, 400);
  }

  try {
    const stripe = new Stripe(llave, { apiVersion: '2024-12-18.acacia' });
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return json({
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      metadata: intent.metadata,
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error ? error.message : 'Error desconocido de Stripe.';
    return json({ error: `No se pudo verificar el pago: ${mensaje}` }, 502);
  }
});
