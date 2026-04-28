// Load sidebar into placeholder
document.addEventListener('DOMContentLoaded', function () {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (placeholder) {
        // Check if we should load Material sidebar (check if material-theme.css is loaded)
        const useMaterialSidebar = document.querySelector('link[href*="material-theme.css"]') !== null;
        const sidebarFile = useMaterialSidebar ? '/sidebar-material.html' : '/sidebar.html';
        
        fetch(sidebarFile)
            .then(response => response.text())
            .then(html => {
                placeholder.innerHTML = html;
                // Initialize sidebar behavior
                initSidebar();
                // Set active link based on current page
                setActiveLink();
                // Initialize user info and role-based visibility
                initUserInfo();
            })
            .catch(err => console.error('Failed to load sidebar:', err));
    }
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('sidebarHamburger');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Ensure sidebar is closed on mobile by default
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    
    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        // Close sidebar when clicking overlay
        overlay.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function (e) {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
                    closeSidebar();
                }
            }
        });

        // Close sidebar on window resize
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) {
                closeSidebar();
            } else if (window.innerWidth <= 768) {
                // Ensure sidebar is closed when resizing to mobile
                closeSidebar();
            }
        });
    }

    // Initialize logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.authManager) {
                window.authManager.logout();
            } else {
                // Fallback logout
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
                window.location.href = '/login.html';
            }
        });
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('sidebarHamburger');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.add('open');
    hamburger.classList.add('open');
    if (overlay) {
        overlay.classList.add('active');
    }
    
    // Prevent body scroll on mobile
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('sidebarHamburger');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('open');
    hamburger.classList.remove('open');
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

function initUserInfo() {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && window.authManager) {
        const user = window.authManager.user;
        if (user) {
            const roleNames = {
                'manager': 'المدير',
                'accountant': 'المحاسب',
                'system_maintenance': 'صيانة النظام'
            };
            userInfoElement.textContent = `${user.username} (${roleNames[user.role] || user.role})`;
        }
    }

    // Apply role-based visibility
    if (window.authManager) {
        window.authManager.updateUIForRole();
    }
}

function setActiveLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('#sidebar a');

    // Remove active class from all links
    links.forEach(link => link.classList.remove('active'));

    // Determine which link should be active based on current path
    let activeHref = '';
    if (currentPath.includes('clients.html')) {
        activeHref = 'clients.html';
    } else if (currentPath.includes('crushers.html')) {
        activeHref = 'crushers.html';
    } else if (currentPath.includes('contractors.html')) {
        activeHref = 'contractors.html';
    } else if (currentPath.includes('employees.html')) {
        activeHref = 'employees.html';
    } else if (currentPath.includes('administration.html')) {
        activeHref = 'administration.html';
    } else if (currentPath.includes('suppliers.html')) {
        activeHref = 'suppliers.html';
    } else if (currentPath.includes('projects.html')) {
        activeHref = 'projects.html';
    } else if (currentPath.includes('expenses.html')) {
        activeHref = 'expenses.html';
    } else if (currentPath.includes('new-entry.html')) {
        activeHref = 'new-entry.html';
    } else if (currentPath.includes('audit-logs.html')) {
        activeHref = 'audit-logs.html';
    } else if (currentPath.includes('recycle-bin.html')) {
        activeHref = 'recycle-bin.html';
    } else if (currentPath.includes('user-management.html')) {
        activeHref = 'user-management.html';
    } else if (currentPath.includes('index.html') || currentPath === '/') {
        activeHref = 'index.html';
    }

    // Add active class to the matching link
    links.forEach(link => {
        if (link.getAttribute('href') === activeHref) {
            link.classList.add('active');
        }
    });
}


// ============================================
// Prevent scroll wheel AND arrow keys from changing number input values
// ============================================
(function() {
    'use strict';

    console.log('🔒 Number input scroll and arrow prevention loaded');

    function preventNumberInputScroll() {
        // Get all number inputs on the page
        const numberInputs = document.querySelectorAll('input[type="number"]');
        
        console.log(`🔒 Protecting ${numberInputs.length} number inputs from scroll and arrows`);
        
        numberInputs.forEach(function(input) {
            // Remove any existing listeners first
            input.removeEventListener('wheel', preventWheel);
            input.removeEventListener('mousewheel', preventWheel);
            input.removeEventListener('keydown', preventArrows);
            
            // Add new listeners
            input.addEventListener('wheel', preventWheel, { passive: false });
            input.addEventListener('mousewheel', preventWheel, { passive: false });
            input.addEventListener('keydown', preventArrows);
        });
    }

    function preventWheel(e) {
        console.log('🚫 Scroll wheel blocked on number input');
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    function preventArrows(e) {
        // Prevent arrow up (38) and arrow down (40) keys
        if (e.keyCode === 38 || e.keyCode === 40) {
            console.log('🚫 Arrow key blocked on number input');
            e.preventDefault();
            return false;
        }
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preventNumberInputScroll);
    } else {
        preventNumberInputScroll();
    }

    // Re-run when modals or dynamic content is added
    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'INPUT' || node.querySelector('input[type="number"]')) {
                            shouldUpdate = true;
                        }
                    }
                });
            }
        });
        if (shouldUpdate) {
            preventNumberInputScroll();
        }
    });

    // Start observing when body is ready
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
})();
