/**
 * sidebar.js
 * توزيع - Sidebar + Hamburger Menu controller
 * Written in vanilla JS - reusable for all sidebar-based pages
 */

(function() {
    // Sidebar links config (expandable in the future)
    const sidebarLinks = [
        { id: 'dashboard', href: /(^|\/)index\.html($|[\?#])/, selectorMatch: 'index.html', element: null },
        { id: 'clients', href: /clients\.html/, selectorMatch: 'clients.html', element: null },
        { id: 'crushers', href: /crushers\.html/, selectorMatch: 'crushers.html', element: null },
        { id: 'wheelContractors', href: /(contractors|wheelContractors)\.html/, selectorMatch: /(contractors|wheelContractors)\.html/, element: null },
        { id: 'newEntry', href: /new-entry\.html/, selectorMatch: 'new-entry.html', element: null }
    ];

    // Returns sidebar element, null if not found
    function getSidebar() {
        return document.getElementById('sidebar');
    }

    // Helper: Safely get current page basename
    function getCurrentPage() {
        const loc = window.location.pathname;
        return loc.substring(loc.lastIndexOf('/') + 1);
    }

    // 1. Generate sidebar links if not already statically present
    function renderSidebar() {
        const sidebar = getSidebar();
        if (!sidebar) return;

        // If you want to generate sidebar dynamically, use this block instead of static HTML
        // For now: Only ensure correct event listeners attached
        // Optionally: You can check/add missing links using sidebarLinks array
    }

    // 2. Active link highlighter based on current page
    function setActiveSidebarLink() {
        const sidebar = getSidebar();
        if (!sidebar) return;

        const links = sidebar.querySelectorAll('a');
        let foundActive = false;
        const currentPage = getCurrentPage();

        links.forEach(link => {
            // Remove any previous active class
            link.classList.remove('active');

            // Match via pathname or href pattern
            let hrefAttr = link.getAttribute('href') || "";
            const absURL = link.href ? link.href : "";

            // Use both direct file match and regex for flexibility
            for (const linkConf of sidebarLinks) {
                if (
                    (typeof linkConf.selectorMatch === 'string' && hrefAttr.endsWith(linkConf.selectorMatch)) ||
                    (linkConf.selectorMatch instanceof RegExp && linkConf.selectorMatch.test(hrefAttr)) ||
                    (linkConf.href && linkConf.href instanceof RegExp && linkConf.href.test(currentPage))
                ) {
                    if (
                        (currentPage && hrefAttr.indexOf(currentPage) !== -1)
                        || (linkConf.selectorMatch && currentPage && currentPage.match(linkConf.selectorMatch))
                        || (absURL && absURL.indexOf(currentPage) !== -1)
                    ) {
                        link.classList.add('active');
                        foundActive = true;
                        break;
                    }
                    // Also allow match by regex over full current location
                    if (
                        linkConf.href instanceof RegExp &&
                        (linkConf.href.test(currentPage) || linkConf.href.test(window.location.pathname) || linkConf.href.test(absURL))
                    ) {
                        link.classList.add('active');
                        foundActive = true;
                        break;
                    }
                }
            }
        });

        // Fallback: activate first if nothing found
        if (!foundActive && links.length > 0) {
            links[0].classList.add('active');
        }
    }

    // 3. Hamburger menu toggle for mobile
    function setupHamburgerMenu() {
        // Button must have "hamburgerBtn" id
        const btn = document.getElementById('hamburgerBtn');
        const sidebar = getSidebar();

        if (!btn || !sidebar) return;

        // Open sidebar mobile
        function openSidebar() {
            sidebar.classList.add('sidebar-open');
            sidebar.style.right = "0";
            // Optional: Add overlay for mobile click-away (or implement as per UI design)
            document.body.classList.add('sidebar-overlay-active');
        }
        // Close sidebar mobile
        function closeSidebar() {
            sidebar.classList.remove('sidebar-open');
            sidebar.style.right = "";
            document.body.classList.remove('sidebar-overlay-active');
        }

        // Click on Hamburger menu
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (sidebar.classList.contains('sidebar-open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        // Click outside sidebar (mobile only)
        document.addEventListener('click', function(e) {
            // Only close sidebar if open, and click is outside sidebar & burger
            const isSidebarOpen = sidebar.classList.contains('sidebar-open');
            if (
                isSidebarOpen &&
                !sidebar.contains(e.target) &&
                e.target !== btn
            ) {
                closeSidebar();
            }
        });

        // Responsive: destroy sidebar-open if > 768px
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                sidebar.style.right = "";
                document.body.classList.remove('sidebar-overlay-active');
            }
        });
    }

    // 4. Link click: Change active class, then go to link
    function setupSidebarLinkActiveHandler() {
        const sidebar = getSidebar();
        if (!sidebar) return;
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                // On mobile: close sidebar after navigation
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('sidebar-open');
                    sidebar.style.right = "";
                    document.body.classList.remove('sidebar-overlay-active');
                }
                // Allow default navigation - don't preventDefault
            });
        });
    }

    // 5. INIT
    function initSidebar() {
        renderSidebar(); // If you want to generate links in the future
        setActiveSidebarLink();
        setupSidebarLinkActiveHandler();
        setupHamburgerMenu();
    }

    // DOMContentLoaded for robustness
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }

})();
