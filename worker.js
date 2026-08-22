export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const order = await request.json();
        if (!order?.name || !order?.phone || !order?.address || !Array.isArray(order?.items) || !order.items.length) {
          return Response.json({ ok: false, error: "Please complete all order details." }, { status: 400 });
        }

        if (!env.ORDERS_KV) {
          return Response.json({ ok: false, error: "Order storage is not connected yet." }, { status: 503 });
        }

        const id = crypto.randomUUID();
        const payload = { id, ...order, receivedAt: new Date().toISOString() };
        await env.ORDERS_KV.put(`order:${id}`, JSON.stringify(payload));
        return Response.json({ ok: true, orderId: id });
      } catch {
        return Response.json({ ok: false, error: "Could not place the order." }, { status: 400 });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
