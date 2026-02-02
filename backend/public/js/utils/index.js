/**
 * Utilities Index
 * Main entry point for all utility functions
 * This file loads all utility modules and makes them available globally
 */

// Load all utility modules dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load utilities in order
async function loadUtilities() {
    try {
        // Core utilities (no dependencies)
        await loadScript('js/utils/formatters.js');
        await loadScript('js/utils/validation.js');
        await loadScript('js/utils/dom.js');

        // API utilities (depends on auth.js being loaded first)
        await loadScript('js/utils/api.js');

        // Modal utilities (depends on DOM utilities)
        await loadScript('js/utils/modals.js');

        console.log('🔧 All utilities loaded successfully');
        initializeUtils();
    } catch (error) {
        console.error('❌ Failed to load utilities:', error);
    }
}

/**
 * Initialize all utilities
 * Call this function after DOM is loaded and auth is available
 */
function initializeUtils() {
    console.log('🔧 Utilities initialized');

    // Check if required dependencies are available
    if (typeof authManager === 'undefined') {
        console.warn('⚠️ authManager not found - API utilities may not work');
    }

    if (typeof Swal === 'undefined') {
        console.warn('⚠️ SweetAlert2 not found - enhanced modals will fallback to native dialogs');
    }
}

// Load utilities when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUtilities);
} else {
    loadUtilities();
}

// Export initialization function
window.initializeUtils = initializeUtils;