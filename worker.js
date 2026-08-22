export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isAdmin = request.headers.get('Authorization') === `Basic ${btoa(`admin:${env.ADMIN_PASSWORD || ''}`)}`;

    if (url.pathname === '/api/orders' && request.method === 'POST') {
      try {
        const order = await request.json();
        if (!order?.name || !order?.phone || !order?.address || !Array.isArray(order?.items) || !order.items.length) return Response.json({ok:false,error:'Please complete all order details.'},{status:400});
        if (!env.ORDERS_KV) return Response.json({ok:false,error:'Order storage is not connected yet.'},{status:503});
        const id = crypto.randomUUID();
        const payload = {id,...order,status:'Pending',receivedAt:new Date().toISOString()};
        await env.ORDERS_KV.put(`order:${id}`,JSON.stringify(payload));
        return Response.json({ok:true,orderId:id});
      } catch { return Response.json({ok:false,error:'Could not place the order.'},{status:400}); }
    }

    if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
      if (!isAdmin) return Response.json({ok:false,error:'Unauthorized'},{status:401});
      if (!env.ORDERS_KV) return Response.json({ok:false,error:'Order storage is not connected yet.'},{status:503});
      const list = await env.ORDERS_KV.list({prefix:'order:'});
      const orders=[];
      for (const key of list.keys) { const value=await env.ORDERS_KV.get(key.name); if(value) orders.push(JSON.parse(value)); }
      orders.sort((a,b)=>String(b.receivedAt).localeCompare(String(a.receivedAt)));
      return Response.json({ok:true,orders});
    }

    if (url.pathname.startsWith('/api/admin/orders/') && request.method === 'PATCH') {
      if (!isAdmin) return Response.json({ok:false,error:'Unauthorized'},{status:401});
      if (!env.ORDERS_KV) return Response.json({ok:false,error:'Order storage is not connected yet.'},{status:503});
      const id=decodeURIComponent(url.pathname.split('/').pop());
      const current=await env.ORDERS_KV.get(`order:${id}`,'json');
      if(!current) return Response.json({ok:false,error:'Order not found'},{status:404});
      const body=await request.json();
      if(!['Pending','Confirmed','Delivered','Cancelled'].includes(body.status)) return Response.json({ok:false,error:'Invalid status'},{status:400});
      current.status=body.status; current.updatedAt=new Date().toISOString();
      await env.ORDERS_KV.put(`order:${id}`,JSON.stringify(current));
      return Response.json({ok:true});
    }

    return env.ASSETS.fetch(request);
  }
};
