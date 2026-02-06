export async function onRequestPost(context) {
  const { request, env } = context;
  const { folderName, password } = await request.json();

  const project = await env.DB.prepare('SELECT passwords, is_encrypted FROM projects WHERE folder_name = ?').bind(folderName).first();

  if (!project) return new Response('Project not found', { status: 404 });
  if (!project.is_encrypted) return new Response(JSON.stringify({ success: true })); // 未加密直接过

  const passwords = JSON.parse(project.passwords || '[]');
  if (passwords.includes(password)) {
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ success: false }), { status: 401 });
}
