// 辅助函数：ArrayBuffer 转 Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 辅助函数：GitHub API 调用
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

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();

  const folderName = formData.get('folderName');
  const isPublic = formData.get('isPublic') === 'true' ? 1 : 0;
  const isEncrypted = formData.get('isEncrypted') === 'true' ? 1 : 0;
  const passwordsRaw = formData.get('passwords') || ''; // 逗号分隔
  const passwords = JSON.stringify(passwordsRaw.split(',').map(p => p.trim()).filter(p => p));
  const articleLink = formData.get('articleLink') || '';
  const files = formData.getAll('files'); // 获取上传的文件

  // 1. 上传文件到 GitHub (projects/folderName/...)
  // 注意：GitHub API 单文件限制和速率限制。这里简化为串行上传。
  for (const file of files) {
    if (file.size > 0) {
        const fileContent = await file.arrayBuffer();
        const contentBase64 = arrayBufferToBase64(fileContent);
        const filePath = `public/projects/${folderName}/${file.name}`;
        
        // 检查文件是否存在以获取 SHA (用于更新)
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
            return new Response(`Failed to upload to GitHub: ${await uploadRes.text()}`, { status: 500 });
        }
    }
  }

  // 2. 更新 D1 数据库
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

  // 3. 重新生成并更新 index.html
  try {
    await updateIndexHtml(env);
  } catch (e) {
    return new Response(`Files uploaded but Index update failed: ${e.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, message: 'Project deployed & Index updated' }));
}

async function updateIndexHtml(env) {
  // A. 获取所有公开项目
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY created_at DESC').all();

  // B. 生成 HTML 卡片
  let cardsHtml = '';
  for (const p of results) {
    const isLocked = p.is_encrypted === 1;
    // 图标 (简单 SVG 字符串)
    const icon = isLocked 
      ? `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
      : `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;

    let actions = '';
    if (isLocked) {
        actions = `
          <button onclick="handleAccess('${p.folder_name}', true)" class="btn-primary">访问</button>
          <button onclick="showPlanetInfo()" class="btn-secondary">知识星球</button>
          ${p.article_link ? `<a href="${p.article_link}" target="_blank" class="btn-link">相关文章</a>` : ''}
        `;
    } else {
        actions = `
          <a href="/projects/${p.folder_name}/index.html" class="btn-primary">访问</a>
        `;
    }

    cardsHtml += `
      <article class="project-card">
        <div class="card-icon">${icon}</div>
        <h3 class="card-title">${p.folder_name}</h3>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }

  // C. 获取 GitHub 上的 index.html
  const indexPath = 'public/index.html';
  const res = await githubRequest(env, 'GET', indexPath);
  if (!res.ok) throw new Error('Cannot fetch index.html from GitHub');
  
  const data = await res.json();
  // 注意：GitHub API 返回的 content 可能有换行符，需要清洗
  const oldContent = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0)));

  // D. 替换标记之间的内容
  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const newContent = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  // E. 推送回 GitHub
  const payload = {
    message: 'Auto-update index.html via Admin Panel',
    content: arrayBufferToBase64(new TextEncoder().encode(newContent)),
    sha: data.sha,
    branch: env.GITHUB_BRANCH || 'main'
  };

  const updateRes = await githubRequest(env, 'PUT', indexPath, payload);
  if (!updateRes.ok) throw new Error('Failed to update index.html on GitHub');
}
