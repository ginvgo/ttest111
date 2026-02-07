
export async function onRequestGet(context) {
  const { env } = context;
  
  // 1. Ensure tables exist
  try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)`).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('page_size', '12')`).run();
      
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS js_libraries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT)`).run();
  } catch(e) {}

  // 2. Fetch Settings
  const settingsRes = await env.DB.prepare("SELECT * FROM app_settings").all();
  const settings = {};
  if (settingsRes.results) {
      settingsRes.results.forEach(r => settings[r.key] = r.value);
  }

  // 3. Fetch Libs
  const libsRes = await env.DB.prepare("SELECT * FROM js_libraries ORDER BY id DESC").all();
  
  return new Response(JSON.stringify({
      settings,
      libraries: libsRes.results || []
  }));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  try {
      if (body.type === 'setting') {
          // Update Setting
          await env.DB.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
              .bind(body.key, body.value).run();
      } 
      else if (body.type === 'lib_add') {
          // Add Lib
          await env.DB.prepare("INSERT INTO js_libraries (name, url) VALUES (?, ?)").bind(body.name, body.url).run();
      }
      else if (body.type === 'lib_del') {
          // Delete Lib
          await env.DB.prepare("DELETE FROM js_libraries WHERE id = ?").bind(body.id).run();
      }
      
      return new Response(JSON.stringify({ success: true }));
  } catch(e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}
