/**
 * functions/api/upload.js
 * 核心逻辑：处理项目发布、文件上传、数据库更新及首页静态重构
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
    const formData = await request.formData();

    // 1. 提取元数据
    const folderName = formData.get('folderName');
    if (!folderName) throw new Error('Folder name is required');

    const isPublic = formData.get('isPublic') === 'true' ? 1 : 0;
    const isEncrypted = formData.get('isEncrypted') === 'true' ? 1 : 0;
    const passwordsRaw = formData.get('passwords') || '';
    // 清洗密码：分割、去空格、过滤空项
    const passwords = JSON.stringify(passwordsRaw.split(',').map(p => p.trim()).filter(p => p));
    const articleLink = formData.get('articleLink') || '';
    
    const files = formData.getAll('files'); 

    // 2. 检查是否有文件需要上传
    let hasFilesToUpload = false;
    for (const f of files) {
        if (f.size > 0) {
            hasFilesToUpload = true;
            break;
        }
    }

    // 3. 执行 GitHub 文件上传 (仅当有文件时)
    if (hasFilesToUpload) {
        for (const file of files) {
            if (file.size > 0) {
                const fileContent = await file.arrayBuffer();
                const contentBase64 = arrayBufferToBase64(fileContent);
                const filePath = `public/projects/${folderName}/${file.name}`;
                
                // 检查文件是否存在以获取 SHA (用于覆盖更新)
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
                if (!uploadRes.ok) {
                    const errText = await uploadRes.text();
                    throw new Error(`GitHub Upload Failed: ${errText}`);
                }
            }
        }
    }

    // 4. 更新 D1 数据库 (Upsert: 插入或更新)
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

    // 5. 重构首页 index.html
    await updateIndexHtml(env);

    return new Response(JSON.stringify({ 
        success: true, 
        message: hasFilesToUpload ? 'Files uploaded & Config updated' : 'Configuration updated successfully' 
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --- 核心：重构 Index.html 逻辑 ---
async function updateIndexHtml(env) {
  // A. 获取所有公开项目
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY created_at DESC').all();

  // B. 生成 HTML 卡片 (适配 style.css 的新 UI)
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
  // GitHub API 返回的 content 含有换行符 \n，需去除
  const rawContent = atob(data.content.replace(/\n/g, ''));
  const oldContent = new TextDecoder('utf-8').decode(Uint8Array.from(rawContent, c => c.charCodeAt(0)));

  // D. 替换标记之间的内容
  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  
  // 使用正则非贪婪匹配替换
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  
  // 构建新内容
  const newContentStr = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  // E. Base64 编码 (处理中文) 并推送回 GitHub
  const newContentBase64 = arrayBufferToBase64(new TextEncoder().encode(newContentStr));

  const payload = {
    message: 'Auto-update index.html via Admin Panel',
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
