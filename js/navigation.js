
(function() {
    function getBasePath() {
        const path = window.location.pathname;
        
        if (path.includes('/legal-notary-frontend/')) {
            return '/legal-notary-frontend/';
        }
        
        const parts = path.split('/');
        parts.pop(); // حذف نام فایل
        return parts.join('/') + '/';
    }

    function fixLinks() {
        const basePath = getBasePath();
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            if (href && href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('/')) {
                if (!href.startsWith('./') && !href.startsWith('../')) {
                    link.setAttribute('href', './' + href);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixLinks);
    } else {
        fixLinks();
    }
})();