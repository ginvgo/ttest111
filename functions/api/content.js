async function githubRequest(env, path) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Cloudflare-Pages',
      'Accept': 'application/vnd.github.v3+json'
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const folder = url.searchParams.get('folder');
  const file = url.searchParams.get('file');

  if (!folder) return new Response('Missing folder', { status: 400 });

  try {
    // 1. 如果没有传 file，则返回文件列表
    if (!file) {
        const res = await githubRequest(env, `public/projects/${folder}`);
        if (!res.ok) return new Response('Folder not found', { status: 404 });
        const data = await res.json();
        // 过滤出文件，忽略文件夹
        const files = data.filter(f => f.type === 'file').map(f => f.name);
        return new Response(JSON.stringify({ files }));
    }

    // 2. 如果传了 file，返回文件内容
    const res = await githubRequest(env, `public/projects/${folder}/${file}`);
    if (!res.ok) return new Response('File not found', { status: 404 });
    const data = await res.json();
    
    // GitHub API 返回 Base64，需要解码
    // 处理中文乱码：先 atob 转 binary string，再用 TextDecoder UTF-8
    const content = new TextDecoder().decode(
        Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0))
    );

    return new Response(JSON.stringify({ content, sha: data.sha }));

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
