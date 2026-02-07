export async function onRequestGet(context) {
    const val = await context.env.DB.prepare("SELECT value FROM app_settings WHERE key='page_size'").first();
    return new Response(JSON.stringify({ pageSize: val ? parseInt(val.value) : 12 }));
}

export async function onRequestPost(context) {
    const { pageSize } = await context.request.json();
    await context.env.DB.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('page_size', ?)").bind(String(pageSize)).run();
    return new Response(JSON.stringify({ success: true }));
}
