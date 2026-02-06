// --- 辅助函数 ---
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
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

// 防 F12 脚本 (混淆压缩版)
const SECURITY_SCRIPT = `
<script>
document.onkeydown=function(e){if(123==e.keyCode||(e.ctrlKey&&e.shiftKey&&(73==e.keyCode||74==e.keyCode))||(e.ctrlKey&&85==e.keyCode))return!1};
document.oncontextmenu=function(e){return!1};
(function(){try{var e=new Function("debugger");setInterval(e,1e3)}catch(e){}})();
</script>
`;

// 定义常用库映射 (实际库地址)
const JS_LIB_MAP = {
    'jquery': '<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>',
    'vue': '<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js"></script>',
    'react': '<script src="https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js"></script><script src="https://cdn.jsdelivr.net/npm/react-dom@17/umd/react-dom.production.min.js"></script>',
    'axios': '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>',
    'lodash': '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>'
};

// --- 主逻辑 ---
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 判断是 JSON 请求 (代码保存) 还是 FormData 请求 (文件上传)
  const contentType = request.headers.get('content-type') || '';
  
  let folderName, isPublic, isEncrypted, passwords, articleLink, injectedLibs;
  let filesToUpload = [];
  let isCodeEditMode = false;

  if (contentType.includes('application/json')) {
    // 模式 A: 代码编辑器保存
    isCodeEditMode = true;
    const body = await request.json();
    folderName = body.folderName;
    filesToUpload = [{ name: body.fileName, content: body.content, isText: true }]; // 构造虚拟文件对象
    // 获取现有配置以保持不变
    const currentProject = await env.DB.prepare('SELECT * FROM projects WHERE folder_name = ?').bind(folderName).first();
    if(!currentProject) return new Response('Project not found', {status: 404});
    
    isPublic = currentProject.is_public;
    isEncrypted = currentProject.is_encrypted;
    passwords = currentProject.passwords;
    articleLink = currentProject.article_link;
    injectedLibs = currentProject.injected_libs; // 保持原样

  } else {
    // 模式 B: 表单上传/配置更新
    const formData = await request.formData();
    folderName = formData.get('folderName');
    isPublic = formData.get('isPublic') === 'true' ? 1 : 0;
    isEncrypted = formData.get('isEncrypted') === 'true' ? 1 : 0;
    const pwRaw = formData.get('passwords') || '';
    passwords = JSON.stringify(pwRaw.split(',').map(p => p.trim()).filter(p => p));
    articleLink = formData.get('articleLink') || '';
    
    // 获取注入的库 (JSON 字符串)
    injectedLibs = formData.get('injectedLibs') || '[]';

    const rawFiles = formData.getAll('files');
    for (const f of rawFiles) {
        if(f.size > 0) filesToUpload.push({ name: f.name, rawFile: f, isText: false });
    }
  }

  // 1. 处理文件上传与注入
  if (filesToUpload.length > 0) {
      for (const fileObj of filesToUpload) {
            let contentBase64;
            
            if (fileObj.isText) {
                // 来自编辑器：直接是字符串，需要重新注入
                let textContent = fileObj.content;
                // 如果是 HTML，重新注入脚本
                if (fileObj.name.endsWith('.html')) {
                   textContent = injectScripts(textContent, injectedLibs);
                }
                contentBase64 = utf8ToBase64(textContent);
            } else {
                // 来自文件上传：二进制
                let arrayBuffer = await fileObj.rawFile.arrayBuffer();
                
                // 如果是 HTML 文件，解码 -> 注入 -> 编码
                if (fileObj.name.endsWith('.html')) {
                    let textContent = new TextDecoder().decode(arrayBuffer);
                    textContent = injectScripts(textContent, injectedLibs);
                    contentBase64 = utf8ToBase64(textContent);
                } else {
                    contentBase64 = arrayBufferToBase64(arrayBuffer);
                }
            }

            const filePath = `public/projects/${folderName}/${fileObj.name}`;
            
            // 获取 SHA
            let sha = null;
            const checkRes = await githubRequest(env, 'GET', filePath);
            if (checkRes.ok) {
                const data = await checkRes.json();
                sha = data.sha;
            }

            const payload = {
                message: `Update ${folderName}/${fileObj.name}`,
                content: contentBase64,
                branch: env.GITHUB_BRANCH || 'main'
            };
            if (sha) payload.sha = sha;

            const uploadRes = await githubRequest(env, 'PUT', filePath, payload);
            if (!uploadRes.ok) return new Response(`GitHub Upload Error: ${fileObj.name}`, { status: 500 });
      }
  }

  // 2. 更新数据库 (仅在非代码编辑模式下，或者你需要更新最后编辑时间)
  if (!isCodeEditMode) {
      await env.DB.prepare(`
        INSERT INTO projects (folder_name, is_public, is_encrypted, passwords, article_link, injected_libs, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(folder_name) DO UPDATE SET
        is_public = excluded.is_public,
        is_encrypted = excluded.is_encrypted,
        passwords = excluded.passwords,
        article_link = excluded.article_link,
        injected_libs = excluded.injected_libs,
        updated_at = excluded.updated_at
      `).bind(folderName, isPublic, isEncrypted, passwords, articleLink, injectedLibs).run();

      // 更新首页索引 (仅当配置变更时才需要，代码编辑不需要更新首页)
      try { await updateIndexHtml(env); } 
      catch (e) { return new Response(e.message, {status: 500}); }
  }

  return new Response(JSON.stringify({ success: true }));
}

// 辅助：注入脚本逻辑
function injectScripts(htmlContent, libsJson) {
    let libs = [];
    try { libs = JSON.parse(libsJson); } catch(e) {}

    // 生成注入的 HTML 字符串
    let injection = '';
    
    // 1. 注入库
    libs.forEach(lib => {
        if(JS_LIB_MAP[lib]) injection += JS_LIB_MAP[lib] + '\n';
    });

    // 2. 注入防 F12
    injection += SECURITY_SCRIPT;

    // 简单替换：插在 </body> 之前，如果没有 body 插在最后
    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', injection + '</body>');
    } else {
        return htmlContent + injection;
    }
}

// --- updateIndexHtml 函数 (保持之前的逻辑，略微精简) ---
// 请务必包含之前的 updateIndexHtml 函数，这里省略以节省篇幅，逻辑不变
async function updateIndexHtml(env) {
    // ... (复制之前的 updateIndexHtml 代码) ...
    // 关键点：确保这部分代码存在，否则 D1 更新后首页不会变
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
        // 修改：传入更多参数给 handleAccess
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

    // 增加 data-name 属性用于搜索
    cardsHtml += `
      <article class="project-card" data-name="${p.folder_name.toLowerCase()}">
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
    content: utf8ToBase64(newContent),
    sha: data.sha,
    branch: env.GITHUB_BRANCH || 'main'
  };

  await githubRequest(env, 'PUT', indexPath, payload);
}
