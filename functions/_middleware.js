export async function onRequest(context) {
  const url = new URL(context.request.url);
  // 新增 /api/content
  const protectedPaths = ['/api/upload', '/api/list', '/api/delete', '/api/content']; 
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  if (isProtected) {
    const cookie = context.request.headers.get('Cookie');
    const envSession = context.env.ADMIN_SESSION_SECRET; 
    if (!cookie || !cookie.includes(`admin_session=${envSession}`)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }
  return context.next();
}
