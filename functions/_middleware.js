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
            // Redirect to Home with denied param
            const homeUrl = new URL('/', url.origin);
            homeUrl.searchParams.set('denied', folderName);
            // Append a timestamp to avoid caching issues with the redirect? Not strictly needed for 302.
            return Response.redirect(homeUrl.toString(), 302);
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
