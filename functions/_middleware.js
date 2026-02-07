export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  
  // Check if accessing a project (e.g., /projects/my-project/index.html)
  // We should match /projects/{folderName}/...
  const match = url.pathname.match(/^\/projects\/([^/]+)(\/.*)?$/);
  
  if (match) {
    const folderName = match[1];
    
    // Skip if accessing static assets that might be global (though usually assets are inside project folder)
    // But we strictly protect the whole folder.

    try {
        // Query DB to check if encrypted
        const project = await env.DB.prepare('SELECT is_encrypted, passwords FROM projects WHERE folder_name = ?').bind(folderName).first();
        
        if (project && project.is_encrypted) {
          // Check Cookie
          const cookies = request.headers.get('Cookie') || '';
          const cookieName = `auth_${folderName}`;
          
          let hasAuth = false;
          if (cookies) {
              const cookieArr = cookies.split(';');
              for (const c of cookieArr) {
                  const [key, val] = c.trim().split('=');
                  if (key === cookieName) {
                      try {
                          const allowed = JSON.parse(project.passwords);
                          // val is the password entered by user
                          if (allowed.includes(val)) {
                              hasAuth = true;
                              break;
                          }
                      } catch(e) { 
                          // JSON parse error or other issue
                      }
                  }
              }
          }

          if (!hasAuth) {
            // Interstitial Page Response
            // Instead of immediate redirect, show a warning page then redirect.
            const html = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>访问受限</title>
                <style>
                    body { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f1f5f9; font-family: sans-serif; margin: 0; }
                    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
                    .icon { font-size: 3rem; margin-bottom: 1rem; }
                    h2 { margin: 0 0 0.5rem 0; color: #1e293b; }
                    p { color: #64748b; margin-bottom: 1.5rem; }
                    .timer { font-weight: bold; color: #3b82f6; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">🔒</div>
                    <h2>访问受限</h2>
                    <p>该项目受密码保护，请先验证身份。<br>正在跳转至验证页面 <span id="timer" class="timer">3</span>...</p>
                </div>
                <script>
                    let count = 3;
                    const el = document.getElementById('timer');
                    const interval = setInterval(() => {
                        count--;
                        el.innerText = count;
                        if (count <= 0) {
                            clearInterval(interval);
                            window.location.href = '/?denied=${folderName}';
                        }
                    }, 1000);
                </script>
            </body>
            </html>
            `;
            
            return new Response(html, {
                status: 403,
                headers: { 'Content-Type': 'text/html;charset=UTF-8' }
            });
          }
        }
    } catch (e) {
        // DB Error or other, fail safe? 
        // For now, let it proceed or log error. 
        // If DB fails, we might block access to be safe, but that might break everything.
        // Let's console log.
        console.error('Middleware Error:', e);
    }
  }

  return next();
}
