export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  if (body.username === env.ADMIN_USER && body.password === env.ADMIN_PASS) {
    const headers = new Headers();
    // 设置一天有效期的 Session Cookie
    headers.append('Set-Cookie', `admin_session=${env.ADMIN_SESSION_SECRET}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
    
    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), { status: 401 });
}
