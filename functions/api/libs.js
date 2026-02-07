export async function onRequestGet(context) {
    const { env } = context;
    // 确保你的 GitHub 仓库中 public/libs 文件夹已存在，否则 API 会报 404
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/public/libs`;
    const res = await fetch(url, {
        headers: { 
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 
            'User-Agent': 'CF-Pages' 
        }
    });
    
    if (!res.ok) return new Response(JSON.stringify([])); 
    
    const data = await res.json();
    // 过滤出 .js 文件
    const files = data.filter(f => f.type === 'file' && f.name.endsWith('.js')).map(f => f.name);
    return new Response(JSON.stringify(files));
}
