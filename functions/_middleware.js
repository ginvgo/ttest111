export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // 定义受保护的路由
  const protectedPaths = ['/admin.html', '/api/upload', '/api/list'];
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  if (isProtected) {
    const cookie = context.request.headers.get('Cookie');
    // 简单的 Token 验证，生产环境建议使用 JWT
    const envSession = context.env.ADMIN_SESSION_SECRET; 
    
    if (!cookie || !cookie.includes(`admin_session=${envSession}`)) {
      // API 请求返回 401
      if (url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      // 页面请求重定向到登录页（这里简化为弹窗提示，实际可做专门登录页，或直接利用 admin.html 的前端逻辑处理）
      // 为了简化，admin.html 内部也会做检查，这里主要防止 API 滥用
      return new Response('Access Denied', { status: 403 });
    }
  }

  return context.next();
}
