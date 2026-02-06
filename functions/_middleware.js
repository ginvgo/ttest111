export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // 仅拦截数据操作接口 (上传、列表、删除)
  // 必须放行 admin.html 以便显示登录界面
  const protectedPaths = ['/api/upload', '/api/list', '/api/delete']; 
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  if (isProtected) {
    const cookie = context.request.headers.get('Cookie');
    const envSession = context.env.ADMIN_SESSION_SECRET; 
    
    if (!cookie || !cookie.includes(`admin_session=${envSession}`)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return context.next();
}
