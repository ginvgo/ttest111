/**
 * functions/api/delete.js
 * 处理项目删除逻辑：从数据库移除 + 更新首页 HTML
 * 注意：为了安全和避免 API 超时，不会物理删除 GitHub 上的文件，只移除展示入口。
 */

// --- 辅助函数：ArrayBuffer 转 Base64 ---
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- 辅助函数：GitHub API 通用请求 ---
async function githubRequest(env, method, path, body = null) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Cloudflare-Pages-Admin',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(url, options);
}

// --- 主处理函数 ---
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { folderName } = await request.json();

    if (!folderName) {
      return new Response(JSON.stringify({ success: false, message: 'Missing folderName' }), { status: 400 });
    }

    // 1. 从 D1 数据库删除记录
    const result = await env.DB.prepare('DELETE FROM projects WHERE folder_name = ?').bind(folderName).run();

    if (!result.success) {
        throw new Error('Failed to delete from database');
    }

    // 2. 重新生成并更新 index.html
    // 这一步至关重要，否则首页还会显示该项目的卡片
    await updateIndexHtml(env);

    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Project removed from Database and Index (Files remain on GitHub)' 
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --- 核心：重构 Index.html 逻辑 ---
// (此函数必须与 upload.js 中的完全一致，以保持 UI 风格统一)
async function updateIndexHtml(env) {
  // A. 获取所有公开项目
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY created_at DESC').all();

  // B. 生成 HTML 卡片 (适配新版 CSS)
  let cardsHtml = '';
  
  if (results.length === 0) {
      cardsHtml = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #64748b; background: white; border-radius: 12px; border: 1px dashed #e2e8f0;">暂无公开项目，请前往后台发布。</div>`;
  } else {
      for (const p of results) {
        const isLocked = p.is_encrypted === 1;
        const dateStr = new Date(p.updated_at).toLocaleDateString();

        // 图标 SVG
        const lockIcon = `<svg style="width:24px;height:24px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`;
        const openIcon = `<svg style="width:24px;height:24px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;
        
        const iconHtml = isLocked ? lockIcon : openIcon;
        const iconClass = isLocked ? 'card-icon locked' : 'card-icon';

        // 按钮逻辑
        let actions = '';
        if (isLocked) {
            actions = `
              <button onclick="handleAccess('${p.folder_name}', true)" class="btn btn-primary btn-sm">🔒 访问</button>
              <button onclick="showPlanetInfo()" class="btn btn-outline btn-sm">🪐 星球</button>
              ${p.article_link ? `<a href="${p.article_link}" target="_blank" class="btn btn-outline btn-sm">📄 文章</a>` : ''}
            `;
        } else {
            actions = `
              <a href="/projects/${p.folder_name}/index.html" class="btn btn-primary btn-sm">🚀 立即访问</a>
            `;
        }

        cardsHtml += `
          <article class="project-card">
            <div class="${iconClass}">
                ${iconHtml}
            </div>
            <h3 class="card-title">${p.folder_name}</h3>
            <p class="card-meta">更新于: ${dateStr}</p>
            <div class="card-actions">
                ${actions}
            </div>
          </article>
        `;
      }
  }

  // C. 获取 GitHub 上的 index.html
  const indexPath = 'public/index.html';
  const res = await githubRequest(env, 'GET', indexPath);
  if (!res.ok) throw new Error('Cannot fetch index.html from GitHub');
  
  const data = await res.json();
  
  // Base64 解码 (处理中文防乱码)
  const rawContent = atob(data.content.replace(/\n/g, ''));
  const oldContent = new TextDecoder('utf-8').decode(Uint8Array.from(rawContent, c => c.charCodeAt(0)));

  // D. 替换标记之间的内容
  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const newContentStr = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  // E. Base64 编码 (处理中文) 并推送回 GitHub
  const newContentBase64 = arrayBufferToBase64(new TextEncoder().encode(newContentStr));

  const payload = {
    message: 'Auto-update index.html (Project Deleted)',
    content: newContentBase64,
    sha: data.sha,
    branch: env.GITHUB_BRANCH || 'main'
  };

  const updateRes = await githubRequest(env, 'PUT', indexPath, payload);
  if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Failed to update index.html: ${err}`);
  }
}
