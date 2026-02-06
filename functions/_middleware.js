export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // 1. 定义受保护的路径
  // 注意：【绝对不要】把 '/admin.html' 放进去，否则页面加载不出来，弹窗也就出不来。
  // 我们只保护“数据接口”
  const protectedPaths = [
    '/api/upload', 
    '/api/list'
  ];

  // 检查当前请求路径是否需要保护
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  if (isProtected) {
    const cookie = context.request.headers.get('Cookie');
    const envSession = context.env.ADMIN_SESSION_SECRET; 
    
    // 2. 验证 Cookie
    if (!cookie || !cookie.includes(`admin_session=${envSession}`)) {
      // 如果没登录，API 返回 401 错误
      // 前端 JS 收到 401 后，会知道需要弹窗让用户登录
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 放行其他请求（包括 admin.html）
  return context.next();
}
