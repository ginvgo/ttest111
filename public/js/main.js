let currentFolder = '';

function handleAccess(folderName, isEncrypted) {
    if (!isEncrypted) {
        window.location.href = `/projects/${folderName}/index.html`;
        return;
    }
    currentFolder = folderName;
    document.getElementById('passwordModal').classList.remove('hidden');
}

function showPlanetInfo() {
    document.getElementById('planetModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    document.getElementById('accessPassword').value = '';
}

async function verifyPassword() {
    const password = document.getElementById('accessPassword').value;
    if (!password) return alert('请输入密码');

    const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: currentFolder, password })
    });

    const data = await res.json();
    if (data.success) {
        // 验证通过，跳转
        window.location.href = `/projects/${currentFolder}/index.html`;
    } else {
        alert('密码错误');
    }
}
