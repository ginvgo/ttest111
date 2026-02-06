function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function githubRequest(env, method, path, body = null) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Cloudflare-Pages',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(url, options);
}

// 核心 HTML 生成逻辑 (适配新 CSS)
async function updateIndexHtml(env) {
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY updated_at DESC').all();

  let cardsHtml = '';
  for (const p of results) {
    const isLocked = p.is_encrypted === 1;
    
    // 不同的 Icon 样式
    const iconClass = isLocked ? 'card-icon locked' : 'card-icon';
    const iconSvg = isLocked 
      ? `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
      : `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;

    let actions = '';
    if (isLocked) {
        actions = `
          <button onclick="handleAccess('${p.folder_name}', true)" class="btn btn-primary btn-sm">访问</button>
          <button onclick="showPlanetInfo()" class="btn btn-outline btn-sm">知识星球</button>
          ${p.article_link ? `<a href="${p.article_link}" target="_blank" class="btn btn-outline btn-sm">文章</a>` : ''}
        `;
    } else {
        actions = `
          <a href="/projects/${p.folder_name}/index.html" class="btn btn-primary btn-sm">立即访问</a>
        `;
    }

    cardsHtml += `
      <article class="project-card">
        <div class="${iconClass}">${iconSvg}</div>
        <h3 class="card-title">${p.folder_name}</h3>
        <div class="card-meta">
            ${isLocked ? '需要密码访问' : '公开演示项目'}
        </div>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }

  const indexPath = 'public/index.html';
  const res = await githubRequest(env, 'GET', indexPath);
  if (!res.ok) throw new Error('Cannot fetch index.html from GitHub');
  
  const data = await res.json();
  const oldContent = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0)));

  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const newContent = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  const payload = {
    message: 'Update project list via Admin',
    content: arrayBufferToBase64(new TextEncoder().encode(newContent)),
    sha: data.sha,
    branch: env.GITHUB_BRANCH || 'main'
  };

  const updateRes = await githubRequest(env, 'PUT', indexPath, payload);
  if (!updateRes.ok) throw new Error('Failed to update index.html on GitHub');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();

  const folderName = formData.get('folderName');
  const isPublic = formData.get('isPublic') === 'true' ? 1 : 0;
  const isEncrypted = formData.get('isEncrypted') === 'true' ? 1 : 0;
  const passwordsRaw = formData.get('passwords') || '';
  const passwords = JSON.stringify(passwordsRaw.split(',').map(p => p.trim()).filter(p => p));
  const articleLink = formData.get('articleLink') || '';
  
  const files = formData.getAll('files');
  let hasFiles = false;
  for (const f of files) { if(f.size > 0) hasFiles = true; }

  // 1. 文件上传 (仅当有文件时)
  if (hasFiles) {
      for (const file of files) {
        if (file.size > 0) {
            const fileContent = await file.arrayBuffer();
            const contentBase64 = arrayBufferToBase64(fileContent);
            const filePath = `public/projects/${folderName}/${file.name}`;
            
            let sha = null;
            const checkRes = await githubRequest(env, 'GET', filePath);
            if (checkRes.ok) {
                const data = await checkRes.json();
                sha = data.sha;
            }

            const payload = {
                message: `Update ${folderName}/${file.name}`,
                content: contentBase64,
                branch: env.GITHUB_BRANCH || 'main'
            };
            if (sha) payload.sha = sha;

            const uploadRes = await githubRequest(env, 'PUT', filePath, payload);
            if (!uploadRes.ok) return new Response(`GitHub Upload Error`, { status: 500 });
        }
      }
  }

  // 2. 更新数据库
  await env.DB.prepare(`
    INSERT INTO projects (folder_name, is_public, is_encrypted, passwords, article_link, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(folder_name) DO UPDATE SET
    is_public = excluded.is_public,
    is_encrypted = excluded.is_encrypted,
    passwords = excluded.passwords,
    article_link = excluded.article_link,
    updated_at = excluded.updated_at
  `).bind(folderName, isPublic, isEncrypted, passwords, articleLink).run();

  // 3. 更新首页
  try { await updateIndexHtml(env); } 
  catch (e) { return new Response(e.message, {status: 500}); }

  return new Response(JSON.stringify({ success: true }));
}
