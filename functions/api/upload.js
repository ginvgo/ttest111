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

// 防 F12 脚本
const SECURITY_SCRIPT = `
<script>
document.onkeydown=function(e){if(123==e.keyCode||(e.ctrlKey&&e.shiftKey&&(73==e.keyCode||74==e.keyCode))||(e.ctrlKey&&85==e.keyCode))return!1};
document.oncontextmenu=function(e){return!1};
(function(){try{var e=new Function("debugger");setInterval(e,1e3)}catch(e){}})();
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

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // === Auto Migration: Ensure columns exist ===
  try { await env.DB.prepare("ALTER TABLE projects ADD COLUMN project_name TEXT").run(); } catch(e) {}
  try { await env.DB.prepare("ALTER TABLE projects ADD COLUMN injected_libs TEXT").run(); } catch(e) {}
  try { await env.DB.prepare("ALTER TABLE projects ADD COLUMN remember_days INTEGER DEFAULT 30").run(); } catch(e) {}
  try { await env.DB.prepare("ALTER TABLE projects ADD COLUMN icon_url TEXT").run(); } catch(e) {}
  try { await env.DB.prepare("ALTER TABLE projects ADD COLUMN extra_buttons TEXT").run(); } catch(e) {} // JSON string
  try { 
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)`).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('page_size', '12')`).run();
  } catch(e) {}
  // ============================================

  const contentType = request.headers.get('content-type') || '';
  let folderName, projectName, isPublic, isEncrypted, passwords, articleLink, injectedLibs, rememberDays, iconUrl, extraButtons;

  let filesToUpload = [];
  let isCodeEditMode = false;

  if (contentType.includes('application/json')) {
      // JSON mode (Code Editor Save)
      const data = await request.json();
      
      // === 模式 A: 代码编辑器保存 ===
      isCodeEditMode = true;
      folderName = data.folderName;
      
      // 构造虚拟文件对象 (Text mode)
      filesToUpload = [{ name: data.fileName, content: data.content, isText: true }]; 
      
      // 获取现有配置以保持不变
      const currentProject = await env.DB.prepare('SELECT * FROM projects WHERE folder_name = ?').bind(folderName).first();
      if(!currentProject) return new Response('Project not found', {status: 404});
      
      // 保持原有配置
      projectName = currentProject.project_name;
      isPublic = currentProject.is_public;
      isEncrypted = currentProject.is_encrypted;
      passwords = currentProject.passwords;
      articleLink = currentProject.article_link;
      injectedLibs = currentProject.injected_libs;
      rememberDays = currentProject.remember_days;
      iconUrl = currentProject.icon_url;
      extraButtons = currentProject.extra_buttons;

  } else {
    // === 模式 B: 表单上传/配置更新 ===
    const formData = await request.formData();
    folderName = formData.get('folderName');
    projectName = formData.get('projectName') || folderName; // Default to folderName if empty
    isPublic = formData.get('isPublic') === 'true' ? 1 : 0;
    isEncrypted = formData.get('isEncrypted') === 'true' ? 1 : 0;
    const pwRaw = formData.get('passwords') || '';
    passwords = JSON.stringify(pwRaw.split(',').map(p => p.trim()).filter(p => p));
    articleLink = formData.get('articleLink') || '';
    injectedLibs = formData.get('injectedLibs') || '{}'; // JSON Object String
    rememberDays = parseInt(formData.get('rememberDays') || '30');
    iconUrl = formData.get('iconUrl') || '';
    extraButtons = formData.get('extraButtons') || '[]';

    const rawFiles = formData.getAll('files');
    for (const f of rawFiles) {
        if(f.size > 0) filesToUpload.push({ name: f.name, rawFile: f, isText: false });
    }
  }

  // 2. 执行文件上传 (修复：只要 filesToUpload 有内容就执行)
  if (filesToUpload.length > 0) {
      for (const fileObj of filesToUpload) {
            let contentBase64;
            
            // 如果是 HTML 文件，注入脚本
            if (fileObj.name.endsWith('.html')) {
                let textContent = '';
                if (fileObj.isText) {
                    textContent = fileObj.content;
                } else {
                    textContent = new TextDecoder().decode(await fileObj.rawFile.arrayBuffer());
                }
                
                // 注入逻辑
                textContent = injectScripts(textContent, injectedLibs);
                contentBase64 = utf8ToBase64(textContent);
            } 
            else if (fileObj.isText) {
                // 非HTML的文本文件 (如 css/js 编辑)
                contentBase64 = utf8ToBase64(fileObj.content);
            }
            else {
                // 二进制文件上传
                contentBase64 = arrayBufferToBase64(await fileObj.rawFile.arrayBuffer());
            }

            const filePath = `public/projects/${folderName}/${fileObj.name}`;
            
            // 获取 SHA 用于覆盖
            let sha = null;
            const checkRes = await githubRequest(env, 'GET', filePath);
            if (checkRes.ok) {
                const data = await checkRes.json();
                sha = data.sha;
            }

            const payload = {
                message: isCodeEditMode ? `Edit ${folderName}/${fileObj.name}` : `Upload ${folderName}/${fileObj.name}`,
                content: contentBase64,
                branch: env.GITHUB_BRANCH || 'main'
            };
            if (sha) payload.sha = sha;

            const uploadRes = await githubRequest(env, 'PUT', filePath, payload);
            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                return new Response(`GitHub Upload Error: ${errText}`, { status: 500 });
            }
      }
  }

  // 3. 更新数据库 (仅在非代码编辑模式下更新元数据)
  if (!isCodeEditMode) {
      await env.DB.prepare(`
        INSERT INTO projects (folder_name, project_name, is_public, is_encrypted, passwords, article_link, injected_libs, remember_days, icon_url, extra_buttons, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(folder_name) DO UPDATE SET
            project_name = excluded.project_name,
            is_public = excluded.is_public,
            is_encrypted = excluded.is_encrypted,
            passwords = excluded.passwords,
            article_link = excluded.article_link,
            injected_libs = excluded.injected_libs,
            remember_days = excluded.remember_days,
            icon_url = excluded.icon_url,
            extra_buttons = excluded.extra_buttons,
            updated_at = datetime('now')
      `).bind(folderName, projectName, isPublic, isEncrypted, passwords, articleLink, injectedLibs, rememberDays, iconUrl, extraButtons).run();
  }

  return new Response(JSON.stringify({ success: true }));
}

function injectScripts(htmlContent, libsJson) {
    let config = { presets: [], customFiles: [], customCode: '' };
    try { 
        // 兼容旧格式(数组)和新格式(对象)
        const parsed = JSON.parse(libsJson); 
        if(Array.isArray(parsed)) config.presets = parsed;
        else config = { ...config, ...parsed };
    } catch(e) {}

    let injection = '\n<!-- Injected Libs -->\n';
    
    // 1. 预设库 & Custom Shared Libs
    if(config.presets) {
        config.presets.forEach(lib => {
            if(PRESET_LIBS[lib]) {
                injection += PRESET_LIBS[lib] + '\n';
            } else if (lib.startsWith('/libs/')) {
                 // Shared Libs (absolute path)
                 injection += `<script src="${lib}"></script>\n`;
            }
        });
    }

    // 2. 自定义项目文件引用 (相对路径)
    if(config.customFiles) {
        config.customFiles.forEach(file => {
            injection += `<script src="./${file}"></script>\n`;
        });
    }

    // 3. 自定义代码
    if(config.customCode) {
        injection += `<script>\n${config.customCode}\n</script>\n`;
    }

    // 4. 防 F12
    injection += SECURITY_SCRIPT;

    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', injection + '</body>');
    } else {
        return htmlContent + injection;
    }
}

