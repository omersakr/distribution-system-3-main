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
        await loadScript('js/utils/loader.js');
        await loadScript('js/utils/form-submit.js'); // Prevent double submission

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


/**
 * Prevent scroll wheel from changing number input values
 * This prevents accidental value changes when scrolling
 */
document.addEventListener('DOMContentLoaded', function() {
    // Prevent wheel event on number inputs
    document.addEventListener('wheel', function(e) {
        if (e.target.type === 'number' && document.activeElement === e.target) {
            e.preventDefault();
            e.target.blur(); // Remove focus to prevent further changes
            setTimeout(() => e.target.focus(), 0); // Restore focus
        }
    }, { passive: false });

    // Also prevent on input event
    document.addEventListener('input', function(e) {
        if (e.target.type === 'number') {
            // Ensure the input doesn't change via scroll
            e.target.addEventListener('wheel', function(evt) {
                evt.preventDefault();
            }, { passive: false });
        }
    });
});
