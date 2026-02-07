export async function onRequestPost(context) {
  const { request, env } = context;
  const { folderName, password, remember } = await request.json();

  const project = await env.DB.prepare('SELECT passwords, is_encrypted, remember_days FROM projects WHERE folder_name = ?').bind(folderName).first();

  if (!project) return new Response('Project not found', { status: 404 });
  if (!project.is_encrypted) return new Response(JSON.stringify({ success: true }));

  const passwords = JSON.parse(project.passwords || '[]');
  
  if (passwords.includes(password)) {
    // 密码正确
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    // 无论是否勾选记住密码，都必须设置 Cookie，否则无法通过 Middleware 验证
    // 如果不勾选记住密码，则设置 Session Cookie (无 Max-Age)
    let cookieStr = `auth_${folderName}=${encodeURIComponent(password)}; Path=/; SameSite=Lax`;
    
    if (remember) {
        const days = project.remember_days || 30;
        const maxAge = days * 86400;
        cookieStr += `; Max-Age=${maxAge}`;
    }

    headers.append('Set-Cookie', cookieStr);

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response(JSON.stringify({ success: false }), { status: 401 });
}
