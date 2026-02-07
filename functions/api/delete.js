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

// 必须重复定义此函数，因为 Worker 环境不支持简单的模块共享
async function updateIndexHtml(env) {
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY updated_at DESC').all();

  let cardsHtml = '';
  for (const p of results) {
    const isLocked = p.is_encrypted === 1;
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
  if (!res.ok) throw new Error('Cannot fetch index.html');
  
  const data = await res.json();
  const oldContent = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0)));

  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const newContent = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  const payload = {
    message: 'Remove project via Admin',
    content: arrayBufferToBase64(new TextEncoder().encode(newContent)),
    sha: data.sha,
    branch: env.GITHUB_BRANCH || 'main'
  };

  await githubRequest(env, 'PUT', indexPath, payload);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { folderName } = await request.json();

  if (!folderName) return new Response('Missing folderName', { status: 400 });

  // 1. 数据库删除
  await env.DB.prepare('DELETE FROM projects WHERE folder_name = ?').bind(folderName).run();

  // 2. 更新 Index HTML
  try {
    await updateIndexHtml(env);
  } catch (e) {
    return new Response(`DB Deleted but Index update failed: ${e.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }));
}
