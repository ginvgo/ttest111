export async function onRequestPost(context) {
  const { request, env } = context;

  // Check Admin Auth
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/admin_session=([^;]+)/);
  let isAdmin = false;
  if (match) {
      const token = match[1];
      try {
          const res = await env.DB.prepare('SELECT 1 FROM admin_users WHERE session_token = ?').bind(token).first();
          if (res) isAdmin = true;
      } catch(e) {}
  }
  if (!isAdmin) return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });

  const { folderName } = await request.json();

  if (!folderName) return new Response('Missing folderName', { status: 400 });

  try {
      // 1. 删除数据库记录
      await env.DB.prepare('DELETE FROM projects WHERE folder_name = ?').bind(folderName).run();
      
      // Note: GitHub API does not support deleting a directory directly.
      // We would need to list all files and delete them one by one.
      // For now, removing from DB is sufficient to hide it and block access via middleware.
      
      return new Response(JSON.stringify({ success: true }));
  } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}
