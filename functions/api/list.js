export async function onRequestGet(context) {
  const { env } = context;
  // 获取所有项目信息
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  return new Response(JSON.stringify(results));
}
