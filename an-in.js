
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
}, false);


document.addEventListener('keydown', function(e) {

    if(e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    

    if(e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
    }
    

    if(e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
    }
    

    if(e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
    }
}, false);


(function detectDevTools() {
    const devtools = {
        isOpen: false,
        orientation: undefined
    };
    
    const threshold = 160;
    

    const emitEvent = (isOpen, orientation) => {
        if (devtools.isOpen !== isOpen || devtools.orientation !== orientation) {
            devtools.isOpen = isOpen;
            devtools.orientation = orientation;
            if (isOpen) {
                // 静默处理，无弹窗
                // 可选：重定向或刷新页面
                // window.location.reload();
            }
        }
    };
    

    const checkDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const orientation = widthThreshold ? 'vertical' : 'horizontal';
        
        if (widthThreshold || heightThreshold) {
            emitEvent(true, orientation);
        } else {
            emitEvent(false, null);
        }
    };
    

    const devToolsChecker = () => {
        const startTime = new Date();
        console.log('检查开发者工具...');
        debugger;
        const endTime = new Date();
        
        if (endTime - startTime > 100) {
            emitEvent(true, null);
        }
    };
    

    window.addEventListener('resize', checkDevTools);
    setInterval(checkDevTools, 1000);
    setInterval(devToolsChecker, 1000);
})();


document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
}, false);
