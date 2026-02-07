export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // 定义受保护的 API 路径 (管理端接口)
  const protectedPaths = [
    '/api/upload', 
    '/api/list', 
    '/api/delete', 
    '/api/content',
    '/api/settings'
    // 注意：/api/libs 如果只读可以公开，但为了防止暴露结构，建议也保护。
    // upload.js 已经处理了 libs 的上传，这里 libs.js 主要是读取列表。
  ]; 
  
  // 特殊情况：/api/libs 的 GET 请求如果是给后台用的，需要保护。
  if (url.pathname.startsWith('/api/libs')) protectedPaths.push('/api/libs');

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
