let currentFolder = '';

// Check for redirect param
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deniedFolder = params.get('denied');
    if (deniedFolder) {
        const modal = document.getElementById('passwordModal');
        if(modal) {
             currentFolder = deniedFolder;
             document.getElementById('modalProjectName').innerText = deniedFolder; // Temporary ID
             // Try to find name if list is loaded? Hard to sync. Just show ID.
             document.getElementById('pwdError').innerText = '该项目为加密项目，禁止直接访问。请验证密码。';
             document.getElementById('pwdError').style.display = 'block';
             modal.classList.add('active');
             
             // Clean URL to avoid loop if they refresh
             window.history.replaceState({}, document.title, "/");
        }
    }
});

function handleAccess(folderName, isEncrypted, projectName) {
    if (!isEncrypted) {
        window.location.href = `/projects/${folderName}/index.html`;
        return;
    }
    
    // Check cookie
    if (getCookie(`auth_${folderName}`)) { 
        window.location.href = `/projects/${folderName}/index.html`;
        return;
    }

    currentFolder = folderName;
    document.getElementById('modalProjectName').innerText = projectName || folderName;
    document.getElementById('accessPassword').value = '';
    document.getElementById('chkRemember').checked = false;
    document.getElementById('pwdError').style.display = 'none';
    document.getElementById('passwordModal').classList.add('active');
}

function showPlanetInfo() {
    // Legacy function, keeping if needed or remove
    alert('Please contact admin for password.');
}

function closeModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('accessPassword').value = '';
}

async function verifyPassword() {
    const password = document.getElementById('accessPassword').value;
    const remember = document.getElementById('chkRemember').checked;
    
    if (!password) return;

    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderName: currentFolder, password, remember })
        });

        const data = await res.json();
        if (data.success) {
            window.location.href = `/projects/${currentFolder}/index.html`;
        } else {
            document.getElementById('pwdError').style.display = 'block';
        }
    } catch (e) {
        alert('Error verifying password');
    }
}

function getCookie(name) {
    const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}
