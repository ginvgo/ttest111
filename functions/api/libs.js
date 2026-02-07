// 获取 /public/libs 下的文件
export async function onRequestGet(context) {
    const { env } = context;
    // 调用 GitHub API 获取 public/libs 内容
    // 注意：需要确保 GitHub 上存在 public/libs 文件夹，否则 API 会报错 404
    // 建议首次部署时手动在 public 下创建 libs 文件夹并放一个空文件
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/public/libs`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 'User-Agent': 'CF-Pages' }
    });
    
    if (!res.ok) return new Response(JSON.stringify([])); // 文件夹不存在或空
    const data = await res.json();
    const files = data.filter(f => f.type === 'file' && f.name.endsWith('.js')).map(f => f.name);
    return new Response(JSON.stringify(files));
}

// 上传新库到 /public/libs
export async function onRequestPost(context) {
    // 逻辑类似于 upload.js，单纯上传文件到 public/libs/
    // ... (省略重复代码，参考 upload.js 的 GitHub PUT 逻辑)
}
