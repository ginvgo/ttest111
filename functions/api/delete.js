// 辅助：Base64处理
function utf8ToBase64(str) { return btoa(unescape(encodeURIComponent(str))); }

// 辅助：GitHub请求
async function githubRequest(env, method, path, body = null) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'CF-Pages',
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(url, options);
}

// 辅助：更新首页 HTML (逻辑需与 upload.js 保持一致)
async function updateIndexHtml(env) {
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY updated_at DESC').all();

  let cardsHtml = '';
  for (const p of results) {
    const displayTitle = p.title || p.folder_name;
    const isLocked = p.is_encrypted === 1;
    const iconClass = isLocked ? 'card-icon locked' : 'card-icon';
    const iconSvg = isLocked 
      ? `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
      : `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;

    let actions = '';
    if (isLocked) {
        actions = `
          <button onclick="handleAccess('${p.folder_name}', true, '${displayTitle}')" class="btn btn-primary btn-sm">访问</button>
          <button onclick="showPlanetInfo()" class="btn btn-outline btn-sm">知识星球</button>
          ${p.article_link ? `<a href="${p.article_link}" target="_blank" class="btn btn-outline btn-sm">文章</a>` : ''}
        `;
    } else {
        actions = `
          <a href="/projects/${p.folder_name}/index.html" class="btn btn-primary btn-sm">立即访问</a>
        `;
    }

    cardsHtml += `
      <article class="project-card" data-name="${displayTitle.toLowerCase()} ${p.folder_name.toLowerCase()}" style="display:none;">
        <div class="${iconClass}">${iconSvg}</div>
        <h3 class="card-title">${displayTitle}</h3>
        <div class="card-meta">${isLocked ? '需要密码访问' : '公开演示项目'}</div>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }

  const indexPath = 'public/index.html';
  const res = await githubRequest(env, 'GET', indexPath);
  if (!res.ok) return; // 如果获取失败暂不处理
  
  const data = await res.json();
  const oldContent = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
  
  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const newContent = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  await githubRequest(env, 'PUT', indexPath, {
    message: 'Remove project via Admin',
    content: utf8ToBase64(newContent),
    sha: data.sha,
    branch: env.GITHUB_BRANCH || 'main'
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { folderName } = await request.json();

  if (!folderName) return new Response('Missing folderName', { status: 400 });

  // 1. 从数据库删除
  await env.DB.prepare('DELETE FROM projects WHERE folder_name = ?').bind(folderName).run();

  // 2. 更新 Index HTML (移除该项目入口)
  // 注意：我们不自动删除 GitHub 上的文件夹，防止误删重要文件，只移除入口
  try {
    await updateIndexHtml(env);
  } catch (e) {
    return new Response(`DB Deleted but Index update failed: ${e.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }));
}
