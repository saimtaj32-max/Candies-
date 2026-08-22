export async function onRequestPost({ request, env }) {
  try {
    const order = await request.json();
    if (!order?.name || !order?.phone || !order?.address || !Array.isArray(order?.items) || !order.items.length) {
      return new Response(JSON.stringify({ ok:false, error:'Missing order details' }), { status:400, headers:{'content-type':'application/json'} });
    }
    const payload = { ...order, receivedAt:new Date().toISOString() };
    if (env.ORDERS_KV) {
      const id = crypto.randomUUID();
      await env.ORDERS_KV.put(`order:${id}`, JSON.stringify(payload));
      return new Response(JSON.stringify({ ok:true, orderId:id }), { headers:{'content-type':'application/json'} });
    }
    return new Response(JSON.stringify({ ok:false, error:'Order storage is not connected yet' }), { status:503, headers:{'content-type':'application/json'} });
  } catch {
    return new Response(JSON.stringify({ ok:false, error:'Invalid request' }), { status:400, headers:{'content-type':'application/json'} });
  }
}