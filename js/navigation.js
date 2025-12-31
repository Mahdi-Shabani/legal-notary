
(function() {
    // پیدا کردن مسیر پایه
    function getBasePath() {
        const path = window.location.pathname;
        
        // اگر روی GitHub Pages هست
        if (path.includes('/legal-notary-frontend/')) {
            return '/legal-notary-frontend/';
        }
        
        // اگر روی ساب‌فولدر دیگه‌ای هست
        const parts = path.split('/');
        parts.pop(); // حذف نام فایل
        return parts.join('/') + '/';
    }

    // اصلاح لینک‌ها
    function fixLinks() {
        const basePath = getBasePath();
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // فقط لینک‌های داخلی HTML
            if (href && href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('/')) {
                // اگه قبلاً اصلاح نشده
                if (!href.startsWith('./') && !href.startsWith('../')) {
                    link.setAttribute('href', './' + href);
                }
            }
        });
    }

    // اجرا بعد از لود صفحه
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixLinks);
    } else {
        fixLinks();
    }
})();