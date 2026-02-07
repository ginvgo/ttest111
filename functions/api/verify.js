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

    // 如果勾选记住密码
    if (remember) {
        const days = project.remember_days || 30;
        const maxAge = days * 86400;
        // 设置 Cookie：project_access_项目名=token (这里简化为 'ok'，实际可做 hash 签名)
        // 注意：Cookie Name 需编码
        headers.append('Set-Cookie', `access_${folderName}=ok; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response(JSON.stringify({ success: false }), { status: 401 });
}
