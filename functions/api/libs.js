
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

// 获取 /public/libs 下的文件
export async function onRequestGet(context) {
    const { env } = context;
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/public/libs`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 'User-Agent': 'CF-Pages' }
    });
    
    if (!res.ok) return new Response(JSON.stringify([])); 
    const data = await res.json();
    const files = data.filter(f => f.type === 'file' && f.name.endsWith('.js')).map(f => f.name);
    return new Response(JSON.stringify(files));
}

// 上传新库到 /public/libs
export async function onRequestPost(context) {
    const { request, env } = context;
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !file.name.endsWith('.js')) {
        return new Response('Invalid file', { status: 400 });
    }

    const contentBase64 = arrayBufferToBase64(await file.arrayBuffer());
    const filePath = `public/libs/${file.name}`;
    
    // Check if exists to get SHA
    let sha = null;
    const checkRes = await githubRequest(env, 'GET', filePath);
    if (checkRes.ok) {
        const data = await checkRes.json();
        sha = data.sha;
    }

    const payload = {
        message: `Upload lib ${file.name}`,
        content: contentBase64,
        branch: env.GITHUB_BRANCH || 'main'
    };
    if (sha) payload.sha = sha;

    const uploadRes = await githubRequest(env, 'PUT', filePath, payload);
    if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return new Response(`GitHub Upload Error: ${errText}`, { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, name: file.name }));
}
