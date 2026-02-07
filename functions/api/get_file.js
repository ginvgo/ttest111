
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path'); // e.g., projects/my-project/index.html

  if (!path) return new Response('Missing path', { status: 400 });

  // Security check: Only allow accessing public folder
  if (!path.startsWith('public/')) return new Response('Invalid path', { status: 403 });

  try {
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
    const res = await fetch(githubUrl, {
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Cloudflare-Pages',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
        if (res.status === 404) return new Response('File not found', { status: 404 });
        return new Response('GitHub API Error', { status: res.status });
    }

    const data = await res.json();
    
    // GitHub API returns content in base64
    let content = '';
    if (data.encoding === 'base64') {
        content = atob(data.content.replace(/\n/g, ''));
        // Handle UTF-8 properly
        content = new TextDecoder('utf-8').decode(Uint8Array.from(content.split('').map(c => c.charCodeAt(0))));
    } else {
        content = data.content;
    }

    return new Response(JSON.stringify({ content, sha: data.sha }), {
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
