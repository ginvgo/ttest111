
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // 1. Ensure Table Exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT PRIMARY KEY,
        password TEXT,
        session_token TEXT
      )
    `).run();

    // 2. Ensure Default Admin Exists
    const countRes = await env.DB.prepare("SELECT COUNT(*) as count FROM admin_users").first();
    if (countRes.count === 0) {
      await env.DB.prepare("INSERT INTO admin_users (username, password) VALUES ('admin', '123456')").run();
    }

    // 3. Handle Login
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
        return new Response(JSON.stringify({ success: false, message: 'Missing credentials' }), { status: 400 });
    }

    const user = await env.DB.prepare("SELECT * FROM admin_users WHERE username = ? AND password = ?").bind(username, password).first();

    if (user) {
        // Login Success
        const token = crypto.randomUUID();
        
        // Update Token
        await env.DB.prepare("UPDATE admin_users SET session_token = ? WHERE username = ?").bind(token, username).run();

        const headers = new Headers();
        // Cookie expires in 1 day
        headers.append('Set-Cookie', `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        headers.append('Content-Type', 'application/json');
        
        return new Response(JSON.stringify({ success: true }), { headers });
    } else {
        return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), { status: 401 });
    }
  } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}
