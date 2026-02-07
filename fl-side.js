(function() {

    // ================= 配置区域 =================
    const config = {
        themeColor: '#5E6AD2', // 主题色
       tools: [
      { name: '选品网站 & 产业带地图', href: 'https://sellerhelp.top/选品网站&产业地图/', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart-icon lucide-shopping-cart"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' }, 
      { name: '亚马逊运营工作流（日/周/月）', href: 'https://sellerhelp.top/亚马逊运营工作流程/', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-workflow-icon"><rect x="4" y="4" width="16" height="16" rx="2" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="12" y1="4" x2="12" y2="20" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>' }, 
      { name: '亚马逊AI提示词仓库', href: 'https://amzprompthub.top/', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-collection-icon"><circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" /><line x1="5" y1="12" x2="13" y2="12" /><line x1="11" y1="12" x2="19" y2="12" /></svg>' }, 
      { name: '亚马逊发票模板 & 生成器', href: 'https://amz-invoice.pages.dev/', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scroll-text-icon lucide-scroll-text"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>' }, 
      { name: '亚马逊订单一键分析工具', href: 'https://mp.weixin.qq.com/s/GrdvSTPCq_UNMUnelKz7Eg', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-spline-icon lucide-chart-spline"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>' },  
      { name: 'listing & 站内信敏感词检测', href: 'https://mp.weixin.qq.com/s/zu94-vlOaNW7UnxECULyHg', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-check-icon lucide-book-open-check"><path d="M12 21V7"/><path d="m16 12 2 2 4-4"/><path d="M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3"/></svg>' }, // 🔍
      { name: '广告位竞价分析卡位工具', href: 'https://mp.weixin.qq.com/s/YwBJz4O-jLfoKkkhazvJyg', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-up-icon lucide-arrow-down-up"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>' },   
      { name: '广告批量否词判断工具', href: 'https://mp.weixin.qq.com/s/v_-fhLoN_Ox5F797Fri3RA', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-x-icon lucide-book-x"><path d="m14.5 7-5 5"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="m9.5 7 5 5"/></svg>' }, 
      { name: '可视化智能装箱工具', href: 'https://mp.weixin.qq.com/s/ypU4Ao-v4aUONqnLlcWmkQ', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-tool-icon"><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 8l9-5 9 5v12H3V8z" /><line x1="15" y1="10" x2="15" y2="14" /><line x1="9" y1="10" x2="9" y2="14" /><line x1="12" y1="10" x2="12" y2="14" /></svg>' }, 
      { name: '广告预算科学计算器', href: 'https://mp.weixin.qq.com/s/WqXq36jsG8HHpwqu-ddl1Q', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dollar-sign-icon lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },  
        ],
        
       officialAccount: {
            title: 'Adobe of Amazon',
            image: '/gzh-qr.jpg', 
            desc: '扫码关注获取更多内容干货'
        },

        author: {
            title: '关于作者',
            avatar: '/gzh-qr.jpg', 
            name: 'Ginv',
            intro: '前广州TOP大卖运营。\n项目负责人，0-1亚马逊卖家。\n分享亚马逊+AI内容和工具',
            wechat: 'Adobe of Amazon', 
            email: 'amzginv@yeah.net' 
        },

        planet: {
            title: '加入知识星球',
            image: '/zsxq.jpg', 
            desc: '专属圈子，获取独家资源与深度交流'
        },

        sidebarButtons: {
            home: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
                text: '主页',
                href: '/' 
            },
            official: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
                text: '公众号'
            },
            author: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
                text: '作者'
            },
            planet: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
                text: '星球'
            },
            tools: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
                text: '工具'
            },
            backToTop: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
                text: '顶部'
            }
        }
    };

    const styles = `
    :root {
        --sb-color: ${config.themeColor};
        --sb-bg: #ffffff;
        --sb-hover-bg: #f7f8fa;
        --sb-shadow: 0 10px 30px rgba(0,0,0,0.08);
        --sb-border: 1px solid rgba(0,0,0,0.06);
    }

    /* 侧边栏容器 */
    .floating-sidebar {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        right: 30px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* 按钮样式 */
    .floating-btn {
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border: var(--sb-border);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        color: #666;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        user-select: none;
    }

    .floating-btn:hover, .floating-btn.active {
        transform: scale(1.05) translateX(-2px);
        background: #fff;
        color: var(--sb-color);
        box-shadow: 0 6px 16px rgba(94, 106, 210, 0.15);
        border-color: var(--sb-color);
    }

    .sb-icon {
        margin-bottom: 3px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .sb-icon svg {
        width: 22px;
        height: 22px;
        stroke-width: 1.5;
    }

    /* 弹出面板通用样式 */
    .sidebar-panel {
        position: fixed;
        top: 50%;
        right: 105px; /* 侧边栏宽度 + 间距 */
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border-radius: 16px;
        padding: 20px;
        box-shadow: var(--sb-shadow);
        border: 1px solid rgba(0,0,0,0.05);
        width: 280px;
        display: none; /* 初始隐藏 */
        opacity: 0;
        transform: translate(10px, -50%);
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        z-index: 9999;
        flex-direction: column;
        gap: 15px;
    }

    .sidebar-panel.visible {
        opacity: 1;
        transform: translate(0, -50%);
    }

    .panel-header {
        font-size: 16px;
        font-weight: 700;
        color: #333;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 4px;
    }

    /* 卡片内容优化 */
    .qr-card {
        text-align: center;
    }
    .qr-img {
        width: 100%;
        max-width: 200px;
        border-radius: 8px;
        margin-bottom: 10px;
        border: 1px solid #eee;
    }
    .qr-desc {
        font-size: 13px;
        color: #888;
        line-height: 1.5;
    }

    /* 作者信息卡片 */
    .author-info-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
    }
    .author-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 2px solid var(--sb-color);
        object-fit: cover;
    }
    .author-details h4 {
        margin: 0;
        font-size: 16px;
        color: #333;
    }
    .author-details p {
        margin: 4px 0 0;
        font-size: 12px;
        color: #999;
    }

    .info-item {
        background: #f7f8fa;
        padding: 10px;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #555;
    }
    .copy-btn {
        background: #fff;
        border: 1px solid #ddd;
        color: var(--sb-color);
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .copy-btn:hover {
        background: var(--sb-color);
        color: #fff;
        border-color: var(--sb-color);
    }

    /* 工具列表优化 */
    .tool-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .tool-item {
        display: flex;
        align-items: center;
        padding: 12px;
        background: #f9f9fc;
        border-radius: 10px;
        text-decoration: none;
        color: #444;
        font-size: 14px;
        transition: all 0.2s;
        border: 1px solid transparent;
    }
    .tool-item:hover {
        background: #fff;
        border-color: var(--sb-color);
        color: var(--sb-color);
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        transform: translateX(4px);
    }
    .tool-item svg {
        margin-right: 10px;
        color: var(--sb-color);
    }

    /* 全局提示 Toast */
    .toast-msg {
        position: fixed;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: #fff;
        padding: 10px 20px;
        border-radius: 30px;
        font-size: 14px;
        z-index: 10001;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
    }
    .toast-msg.show {
        opacity: 1;
    }

    /* 移动端适配 */
    @media (max-width: 768px) {
        .floating-sidebar {
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: auto;
            transform: none;
            flex-direction: row;
            justify-content: space-around;
            background: #fff;
            padding: 8px 0;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
            border-top: 1px solid #eee;
            gap: 0;
        }
        .floating-btn {
            border: none;
            box-shadow: none;
            background: transparent;
            height: auto;
            width: auto;
            flex: 1;
            border-radius: 0;
        }
        .floating-btn:hover {
            transform: none;
            background: transparent;
        }
        .floating-btn.active {
             transform: none;
             background: transparent;
        }
        .sidebar-panel {
            right: 0;
            left: 0;
            bottom: 70px; /* 底部导航栏高度 */
            top: auto;
            width: 90%;
            margin: 0 auto;
            transform: translateY(20px);
        }
        .sidebar-panel.visible {
            transform: translateY(0);
        }
    }
    `;

    function generateToolItemsHTML(tools) {
        return tools.map(tool => 
            `<a href="${tool.href}" class="tool-item" target="_blank">
                ${tool.icon}
                <span>${tool.name}</span>
            </a>`
        ).join('');
    }

    const htmlStructure = `
    <div class="floating-sidebar" id="sidebarContainer">
        <div class="floating-btn" id="btnHome"><div class="sb-icon">${config.sidebarButtons.home.icon}</div>${config.sidebarButtons.home.text}</div>
        <div class="floating-btn" id="btnTools"><div class="sb-icon">${config.sidebarButtons.tools.icon}</div>${config.sidebarButtons.tools.text}</div>
        <div class="floating-btn" id="btnOfficial"><div class="sb-icon">${config.sidebarButtons.official.icon}</div>${config.sidebarButtons.official.text}</div>
        <div class="floating-btn" id="btnAuthor"><div class="sb-icon">${config.sidebarButtons.author.icon}</div>${config.sidebarButtons.author.text}</div>
        <div class="floating-btn" id="btnPlanet"><div class="sb-icon">${config.sidebarButtons.planet.icon}</div>${config.sidebarButtons.planet.text}</div>
        <div class="floating-btn" id="btnTop"><div class="sb-icon">${config.sidebarButtons.backToTop.icon}</div>${config.sidebarButtons.backToTop.text}</div>
    </div>

    <div class="sidebar-panel" id="panelOfficial">
        <div class="panel-header">${config.officialAccount.title}</div>
        <div class="qr-card">
            <img src="${config.officialAccount.image}" alt="QR" class="qr-img">
            <div class="qr-desc">${config.officialAccount.desc}</div>
        </div>
    </div>

    <div class="sidebar-panel" id="panelAuthor">
        <div class="panel-header">${config.author.title}</div>
        <div class="author-info-row">
            <img src="${config.author.avatar}" alt="Avatar" class="author-avatar">
            <div class="author-details">
                <h4>${config.author.name}</h4>
                <p>${config.author.intro}</p>
            </div>
        </div>
        <div class="info-item">
            <span>微信: ${config.author.wechat}</span>
            <button class="copy-btn" data-text="${config.author.wechat}">复制</button>
        </div>
        <div class="info-item">
            <span>邮箱: ${config.author.email}</span>
            <button class="copy-btn" data-text="${config.author.email}">复制</button>
        </div>
    </div>

    <div class="sidebar-panel" id="panelPlanet">
        <div class="panel-header">${config.planet.title}</div>
        <div class="qr-card">
            <img src="${config.planet.image}" alt="Planet" class="qr-img">
            <div class="qr-desc">${config.planet.desc}</div>
        </div>
    </div>

    <div class="sidebar-panel" id="panelTools">
        <div class="panel-header">工具推荐</div>
        <div class="tool-list">
            ${generateToolItemsHTML(config.tools)}
        </div>
    </div>
    
    <div id="toastMsg" class="toast-msg">复制成功</div>
    `;

    function init() {
        // 1. 注入 CSS
        const styleEl = document.createElement('style');
        styleEl.innerHTML = styles;
        document.head.appendChild(styleEl);

        // 2. 注入 HTML
        const container = document.createElement('div');
        container.innerHTML = htmlStructure;
        document.body.append(...container.children);

        bindEvents();
    }

    function bindEvents() {
        const map = {
            'btnOfficial': 'panelOfficial',
            'btnAuthor':   'panelAuthor',
            'btnPlanet':   'panelPlanet',
            'btnTools':    'panelTools'
        };

        let closeTimer = null;
        let currentPanelId = null;

        // 判断是否为桌面端 (简单判断：屏幕宽度 > 768px)
        const isDesktop = window.matchMedia("(min-width: 769px)").matches;

        // 通用：显示面板
        const showPanel = (panelId, btnId) => {
            if (closeTimer) clearTimeout(closeTimer);
            
            // 如果已经在显示其他面板，先关闭
            if (currentPanelId && currentPanelId !== panelId) {
                hidePanel(currentPanelId);
            }

            const panel = document.getElementById(panelId);
            const btn = document.getElementById(btnId);
            
            if (!panel) return;

            panel.style.display = 'flex';
            // 强制重绘触发过渡
            panel.offsetHeight; 
            panel.classList.add('visible');
            if(btn) btn.classList.add('active');
            
            currentPanelId = panelId;
        };

        // 通用：隐藏面板 (带延迟)
        const delayHidePanel = (panelId, btnId) => {
            closeTimer = setTimeout(() => {
                hidePanel(panelId, btnId);
            }, 300); // 300ms 延迟，给用户时间移动鼠标
        };

        const hidePanel = (panelId, btnId) => {
            const panel = document.getElementById(panelId || currentPanelId);
            
            if (panel) {
                panel.classList.remove('visible');
                // 等待 CSS 动画结束后隐藏 DOM
                setTimeout(() => {
                    if (!panel.classList.contains('visible')) {
                        panel.style.display = 'none';
                    }
                }, 300);
            }
            
            // 移除按钮激活态
            if(btnId) {
                document.getElementById(btnId)?.classList.remove('active');
            } else {
                document.querySelectorAll('.floating-btn').forEach(b => b.classList.remove('active'));
            }
            currentPanelId = null;
        };

        // 绑定逻辑
        Object.keys(map).forEach(btnId => {
            const panelId = map[btnId];
            const btn = document.getElementById(btnId);
            const panel = document.getElementById(panelId);

            if (!btn || !panel) return;

            // --- 逻辑核心 ---
            
            // 1. 点击事件 (桌面端和移动端通用)
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentPanelId === panelId) {
                    hidePanel(panelId, btnId);
                } else {
                    showPanel(panelId, btnId);
                }
            });

            // 2. 悬浮事件 (仅桌面端)
            if (isDesktop) {
                // 移入按钮：显示
                btn.addEventListener('mouseenter', () => {
                    showPanel(panelId, btnId);
                });
                
                // 移出按钮：准备隐藏
                btn.addEventListener('mouseleave', () => {
                    delayHidePanel(panelId, btnId);
                });

                // 移入面板：取消隐藏
                panel.addEventListener('mouseenter', () => {
                    if (closeTimer) clearTimeout(closeTimer);
                });

                // 移出面板：准备隐藏
                panel.addEventListener('mouseleave', () => {
                    delayHidePanel(panelId, btnId);
                });
            }

            // 阻止面板内的点击冒泡导致关闭
            panel.addEventListener('click', (e) => e.stopPropagation());
        });

        // 全局点击关闭
        document.addEventListener('click', () => {
            if (currentPanelId) hidePanel(currentPanelId);
        });

        // 简单功能按钮
        document.getElementById('btnHome').onclick = () => window.location.href = config.sidebarButtons.home.href;
        document.getElementById('btnTop').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

        // 复制功能
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.target.getAttribute('data-text');
                copyText(text);
            });
        });
    }

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(showToast);
        } else {
            // 兼容写法
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast();
        }
    }

    function showToast() {
        const t = document.getElementById('toastMsg');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
