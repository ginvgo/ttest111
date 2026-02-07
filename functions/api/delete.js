// 辅助函数：GitHub API 请求
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

// 辅助：Base64 编码 (用于更新 Index)
function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// 辅助：更新首页 HTML (删除项目时需要)
async function updateIndexHtml(env) {
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY updated_at DESC').all();

  let cardsHtml = '';
  for (const p of results) {
    const displayTitle = p.title || p.folder_name;
    const isLocked = p.is_encrypted === 1;
    const iconClass = isLocked ? 'card-icon locked' : 'card-icon';
    // 简化的 SVG，请保持与 upload.js 一致
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

    // data-name, data-days 用于前端逻辑
    cardsHtml += `
      <article class="project-card" data-name="${displayTitle.toLowerCase()} ${p.folder_name.toLowerCase()}" data-days="${p.remember_days || 30}" style="display:none;">
        <div class="${iconClass}">${iconSvg}</div>
        <h3 class="card-title">${displayTitle}</h3>
        <div class="card-meta">${isLocked ? '需要密码访问' : '公开演示项目'}</div>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }

  const indexPath = 'public/index.html';
  const res = await githubRequest(env, 'GET', indexPath);
  if (!res.ok) return; 
  
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
  const body = await request.json();
  const { type, folderName, fileName } = body;

  try {
    // 1. 删除整个项目
    if (type === 'project' && folderName) {
        await env.DB.prepare('DELETE FROM projects WHERE folder_name = ?').bind(folderName).run();
        // 更新首页移除入口
        await updateIndexHtml(env);
        return new Response(JSON.stringify({ success: true, message: 'Project deleted' }));
    }

    // 2. 删除特定文件 (代码编辑页)
    if (type === 'file' && folderName && fileName) {
        const path = `public/projects/${folderName}/${fileName}`;
        // 获取 SHA 以执行删除
        const getRes = await githubRequest(env, 'GET', path);
        if (!getRes.ok) return new Response('File not found on GitHub', { status: 404 });
        const data = await getRes.json();
        
        const delRes = await githubRequest(env, 'DELETE', path, {
            message: `Delete file ${fileName}`,
            sha: data.sha,
            branch: env.GITHUB_BRANCH || 'main'
        });
        
        if (!delRes.ok) throw new Error('GitHub delete failed');
        return new Response(JSON.stringify({ success: true, message: 'File deleted' }));
    }

    // 3. 删除公共库 JS
    if (type === 'lib' && fileName) {
        const path = `public/libs/${fileName}`;
        const getRes = await githubRequest(env, 'GET', path);
        if (!getRes.ok) return new Response('Lib not found', { status: 404 });
        const data = await getRes.json();
        
        const delRes = await githubRequest(env, 'DELETE', path, {
            message: `Delete global lib ${fileName}`,
            sha: data.sha,
            branch: env.GITHUB_BRANCH || 'main'
        });

        if (!delRes.ok) throw new Error('GitHub delete failed');
        return new Response(JSON.stringify({ success: true, message: 'Lib deleted' }));
    }

    return new Response('Invalid parameters', { status: 400 });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
}
