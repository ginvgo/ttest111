export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  
  // Get pagination params
  const page = parseInt(url.searchParams.get('page') || '1');
  let pageSize = parseInt(url.searchParams.get('pageSize') || '0'); // 0 means use default
  
  // If pageSize is not provided, fetch from settings
  if (pageSize <= 0) {
      const setting = await env.DB.prepare("SELECT value FROM app_settings WHERE key='page_size'").first();
      pageSize = setting ? parseInt(setting.value) : 12;
  }
  
  const offset = (page - 1) * pageSize;
  const search = url.searchParams.get('search') || '';

  let query = 'SELECT * FROM projects WHERE is_public = 1';
  let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE is_public = 1';
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

  return new Response(JSON.stringify({
      items: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
  }));
}
