export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  
  // Get pagination params
  const page = parseInt(url.searchParams.get('page') || '1');
  let pageSize = parseInt(url.searchParams.get('pageSize') || url.searchParams.get('limit') || '0'); // Support limit alias
  
  // If pageSize is not provided, fetch from settings
  if (pageSize <= 0) {
      const setting = await env.DB.prepare("SELECT value FROM app_settings WHERE key='page_size'").first();
      pageSize = setting ? parseInt(setting.value) : 12;
  }
  
  const offset = (page - 1) * pageSize;
  const search = url.searchParams.get('search') || '';

  // Check Admin Auth
  const cookie = request.headers.get('Cookie') || '';
  const isAdmin = env.ADMIN_SESSION_SECRET && cookie.includes(`admin_session=${env.ADMIN_SESSION_SECRET}`);

  let whereClause = isAdmin ? '1=1' : 'is_public = 1';

  let query = `SELECT * FROM projects WHERE ${whereClause}`;
  let countQuery = `SELECT COUNT(*) as total FROM projects WHERE ${whereClause}`;
  const params = [];

  if (search) {
      query += ' AND (folder_name LIKE ? OR project_name LIKE ?)';
      countQuery += ' AND (folder_name LIKE ? OR project_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  
  // Execute queries
  // Note: D1 bind params order matters.
  // For query: [...searchParams, pageSize, offset]
  // For count: [...searchParams]
  
  const finalParams = [...params, pageSize, offset];
  
  const { results } = await env.DB.prepare(query).bind(...finalParams).all();
  const totalRes = await env.DB.prepare(countQuery).bind(...params).first();
  const total = totalRes.total;

  const items = results.map(p => ({
      folder_name: p.folder_name,
      project_name: p.project_name || p.folder_name, // 优先使用中文名
      is_public: !!p.is_public,
      is_encrypted: !!p.is_encrypted,
      has_article: !!p.article_link,
      icon_url: p.icon_url,
      extra_buttons: p.extra_buttons // JSON string, frontend needs to parse
  }));

  return new Response(JSON.stringify({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
  }));
}
