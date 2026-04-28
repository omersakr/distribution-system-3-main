/**
 * Prevent scroll wheel from changing number input values
 * This prevents accidental value changes when scrolling over number inputs
 */

(function() {
    'use strict';

    // Prevent wheel event on all number inputs
    function preventNumberInputScroll() {
        // Get all number inputs
        const numberInputs = document.querySelectorAll('input[type="number"]');
        
        numberInputs.forEach(function(input) {
            // Prevent scroll wheel changes
            input.addEventListener('wheel', function(e) {
                e.preventDefault();
                this.blur(); // Remove focus temporarily
            }, { passive: false });

            // Prevent mousewheel (older browsers)
            input.addEventListener('mousewheel', function(e) {
                e.preventDefault();
                this.blur();
            }, { passive: false });
        });
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preventNumberInputScroll);
    } else {
        preventNumberInputScroll();
    }

    // Also run when new inputs are added dynamically
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                preventNumberInputScroll();
            }
        });
    });

    // Start observing
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
