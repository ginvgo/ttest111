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

// === 注入脚本定义 ===

// 1. 防 F12 脚本
const SECURITY_SCRIPT = `
<script>
document.onkeydown=function(e){if(123==e.keyCode||(e.ctrlKey&&e.shiftKey&&(73==e.keyCode||74==e.keyCode))||(e.ctrlKey&&85==e.keyCode))return!1};
document.oncontextmenu=function(e){return!1};
(function(){try{var e=new Function("debugger");setInterval(e,1e3)}catch(e){}})();
</script>
`;

// 2. 守门员脚本 (Gatekeeper) - 加密项目专用
// 检测 Cookie，如果没有授权，直接清空页面并跳转回首页
const getGatekeeperScript = (folderName) => `
<script>
(function(){
    function getCookie(name) {
        var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? v[2] : null;
    }
    if (getCookie('access_${folderName}') !== 'ok') {
        document.write('<style>body{background:#f8fafc;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:-apple-system,sans-serif;}.box{background:white;padding:2rem;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);text-align:center;width:90%;max-width:400px;}.icon{font-size:3rem;margin-bottom:1rem;}h2{color:#ef4444;margin:0 0 0.5rem 0;}p{color:#64748b;line-height:1.5;}</style><div class="box"><div class="icon">🚫</div><h2>访问受限</h2><p>您未获得授权或会话已过期。<br>正在跳转至首页验证...</p></div>');
        document.close();
        setTimeout(function(){ window.location.href = '/?target=${folderName}'; }, 2000);
        window.stop();
    }
})();
</script>
`;

// 预设库 CDN
const PRESET_LIBS = {
    'jquery': '<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>',
    'vue': '<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js"></script>',
    'react': '<script src="https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js"></script><script src="https://cdn.jsdelivr.net/npm/react-dom@17/umd/react-dom.production.min.js"></script>',
    'axios': '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>',
    'lodash': '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>'
};

// === 主逻辑 ===
export async function onRequestPost(context) {
  const { request, env } = context;
  const contentType = request.headers.get('content-type') || '';
  
  // 变量初始化
  let folderName, title, isPublic, isEncrypted, passwords, articleLink, injectedLibs, rememberDays;
  let filesToUpload = [];
  let isCodeEditMode = false;
  let isGlobalLibUpload = false; // 标记是否为上传公共库
  let isSettingsUpdate = false;  // 标记是否为更新设置
  
  // --- 分支 A: JSON 请求 (代码保存 / 系统设置) ---
  if (contentType.includes('application/json')) {
    const body = await request.json();
    
    // 分支 A-1: 更新系统设置
    if (body.type === 'settings') {
        await env.DB.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('page_size', ?)").bind(String(body.pageSize)).run();
        return new Response(JSON.stringify({ success: true }));
    }

    // 分支 A-2: 代码编辑保存
    isCodeEditMode = true;
    folderName = body.folderName;
    filesToUpload = [{ name: body.fileName, content: body.content, isText: true }]; 
    
    // 获取现有配置
    const currentProject = await env.DB.prepare('SELECT * FROM projects WHERE folder_name = ?').bind(folderName).first();
    if(!currentProject) return new Response('Project not found', {status: 404});
    
    // 继承原有配置
    title = currentProject.title || folderName;
    isPublic = currentProject.is_public;
    isEncrypted = currentProject.is_encrypted;
    passwords = currentProject.passwords;
    articleLink = currentProject.article_link;
    injectedLibs = currentProject.injected_libs;
    rememberDays = currentProject.remember_days;

  } else {
    // --- 分支 B: FormData 请求 (表单上传 / 全局库上传) ---
    const formData = await request.formData();
    
    // 分支 B-1: 上传全局库
    if (formData.get('isGlobalLib') === 'true') {
        const libs = formData.getAll('files');
        for (const f of libs) {
            if (f.size > 0) {
                const content = arrayBufferToBase64(await f.arrayBuffer());
                await simpleGithubUpload(env, `public/libs/${f.name}`, content, `Upload global lib ${f.name}`);
            }
        }
        return new Response(JSON.stringify({ success: true }));
    }

    // 分支 B-2: 常规项目更新
    folderName = formData.get('folderName');
    title = formData.get('title') || folderName; // 获取展示名称
    isPublic = formData.get('isPublic') === 'true' ? 1 : 0;
    isEncrypted = formData.get('isEncrypted') === 'true' ? 1 : 0;
    
    const pwRaw = formData.get('passwords') || '';
    passwords = JSON.stringify(pwRaw.split(',').map(p => p.trim()).filter(p => p));
    articleLink = formData.get('articleLink') || '';
    injectedLibs = formData.get('injectedLibs') || '{}'; 
    rememberDays = parseInt(formData.get('rememberDays') || '30');

    const rawFiles = formData.getAll('files');
    for (const f of rawFiles) {
        if(f.size > 0) filesToUpload.push({ name: f.name, rawFile: f, isText: false });
    }
  }

  // 1. 执行文件上传 (常规项目)
  if (filesToUpload.length > 0) {
      for (const fileObj of filesToUpload) {
            let contentBase64;
            
            // HTML 处理：注入脚本
            if (fileObj.name.endsWith('.html')) {
                let textContent = fileObj.isText ? fileObj.content : new TextDecoder().decode(await fileObj.rawFile.arrayBuffer());
                
                // A. 注入 JS 库
                textContent = injectScripts(textContent, injectedLibs);

                // B. 如果加密，必须注入 Gatekeeper (放在最前面)
                if (isEncrypted) {
                    textContent = getGatekeeperScript(folderName) + textContent;
                }
                
                contentBase64 = utf8ToBase64(textContent);
            } 
            else if (fileObj.isText) {
                contentBase64 = utf8ToBase64(fileObj.content);
            }
            else {
                contentBase64 = arrayBufferToBase64(await fileObj.rawFile.arrayBuffer());
            }

            await simpleGithubUpload(env, `public/projects/${folderName}/${fileObj.name}`, contentBase64, `Update ${folderName}`);
      }
  }

  // 2. 更新数据库 (仅在非代码编辑模式下)
  if (!isCodeEditMode && !isSettingsUpdate) {
      await env.DB.prepare(`
        INSERT INTO projects (folder_name, title, is_public, is_encrypted, passwords, article_link, injected_libs, remember_days, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(folder_name) DO UPDATE SET
        title = excluded.title,
        is_public = excluded.is_public,
        is_encrypted = excluded.is_encrypted,
        passwords = excluded.passwords,
        article_link = excluded.article_link,
        injected_libs = excluded.injected_libs,
        remember_days = excluded.remember_days,
        updated_at = excluded.updated_at
      `).bind(folderName, title, isPublic, isEncrypted, passwords, articleLink, injectedLibs, rememberDays).run();

      // 更新首页
      try { await updateIndexHtml(env); } 
      catch (e) { return new Response(e.message, {status: 500}); }
  }

  return new Response(JSON.stringify({ success: true }));
}

// 简化的 GitHub 上传函数
async function simpleGithubUpload(env, path, contentBase64, message) {
    let sha = null;
    const checkRes = await githubRequest(env, 'GET', path);
    if (checkRes.ok) {
        const data = await checkRes.json();
        sha = data.sha;
    }
    const payload = { message, content: contentBase64, branch: env.GITHUB_BRANCH || 'main' };
    if (sha) payload.sha = sha;
    const res = await githubRequest(env, 'PUT', path, payload);
    if (!res.ok) throw new Error(`GitHub Upload Failed: ${path}`);
}

// 脚本注入逻辑
function injectScripts(htmlContent, libsJson) {
    let config = { presets: [], customFiles: [], customGlobal: [], customCode: '' };
    try { 
        const parsed = JSON.parse(libsJson); 
        if(Array.isArray(parsed)) config.presets = parsed;
        else config = { ...config, ...parsed };
    } catch(e) {}

    let injection = '\n<!-- Injected by Cloudflare Pages Admin -->\n';
    
    // 1. 预设库
    if(config.presets) config.presets.forEach(k => { if(PRESET_LIBS[k]) injection += PRESET_LIBS[k] + '\n'; });

    // 2. 项目本地库
    if(config.customFiles) config.customFiles.forEach(f => { injection += `<script src="./${f}"></script>\n`; });

    // 3. 全局库 (位于 /libs/)
    if(config.customGlobal) config.customGlobal.forEach(f => { injection += `<script src="/libs/${f}"></script>\n`; });

    // 4. 自定义代码
    if(config.customCode) injection += `<script>\n${config.customCode}\n</script>\n`;

    // 5. 防 F12
    injection += SECURITY_SCRIPT;

    if (htmlContent.includes('</body>')) return htmlContent.replace('</body>', injection + '</body>');
    return htmlContent + injection;
}

// 更新首页 Index.html
async function updateIndexHtml(env) {
  const { results } = await env.DB.prepare('SELECT * FROM projects WHERE is_public = 1 ORDER BY updated_at DESC').all();

  // 1. 生成卡片 HTML
  let cardsHtml = '';
  for (const p of results) {
    // 优先显示中文 Title
    const displayTitle = p.title || p.folder_name;
    const isLocked = p.is_encrypted === 1;
    
    const iconClass = isLocked ? 'card-icon locked' : 'card-icon';
    // 简化 SVG 插入
    const iconSvg = isLocked 
      ? `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
      : `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;

    let actions = '';
    if (isLocked) {
        // 加密项目：传入 title 参数
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

    // 关键：data-name 包含 title 和 folderName 供全局搜索使用
    cardsHtml += `
      <article class="project-card" data-name="${displayTitle.toLowerCase()} ${p.folder_name.toLowerCase()}" style="display:none;"> <!-- 默认隐藏，由JS分页显示 -->
        <div class="${iconClass}">${iconSvg}</div>
        <h3 class="card-title">${displayTitle}</h3>
        <div class="card-meta">${isLocked ? '需要密码访问' : '公开演示项目'}</div>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }

  // 2. 获取并更新 index.html
  const indexPath = 'public/index.html';
  const res = await githubRequest(env, 'GET', indexPath);
  if (!res.ok) throw new Error('Cannot fetch index.html');
  const data = await res.json();
  const oldContent = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
  
  const startMarker = '<!-- PROJECT_LIST_START -->';
  const endMarker = '<!-- PROJECT_LIST_END -->';
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const newContent = oldContent.replace(regex, `${startMarker}\n${cardsHtml}\n${endMarker}`);

  await simpleGithubUpload(env, indexPath, utf8ToBase64(newContent), 'Update project list via Admin');
}
