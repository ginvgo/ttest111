export async function onRequestGet(context) {
    const val = await context.env.DB.prepare("SELECT value FROM app_settings WHERE key='page_size'").first();
    // 默认 12
    return new Response(JSON.stringify({ pageSize: val ? parseInt(val.value) : 12 }));
}
// POST 逻辑已合并在 upload.js 中统一处理，此处保留 GET
