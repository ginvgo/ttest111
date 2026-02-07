export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const folder = url.searchParams.get('folder');
  const file = url.searchParams.get('file');

  if (!folder) return new Response('Missing folder', { status: 400 });

  const githubUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/public/projects/${folder}${file ? '/' + file : ''}`;
  
  const res = await fetch(githubUrl, {
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Cloudflare-Pages',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) return new Response('Not found', { status: 404 });
  const data = await res.json();

  if (!file) {
    // 返回文件列表
    const files = Array.isArray(data) ? data.map(f => f.name) : [];
    return new Response(JSON.stringify({ files }));
  } else {
    // 返回文件内容 (Base64 解码)
    const content = new TextDecoder().decode(
        Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0))
    );
    return new Response(JSON.stringify({ content, sha: data.sha }));
  }
}
