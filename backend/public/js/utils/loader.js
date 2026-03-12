/**
 * Loader Utility Functions
 * Centralized loader management for the application
 */

// Show global loader
function showLoader(text = 'جاري التحميل...') {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        const loaderText = loader.querySelector('.loader-text');
        if (loaderText) {
            loaderText.textContent = text;
        }
        loader.classList.add('active');
    }
}

// Hide global loader
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.remove('active');
    }
}

// Show inline loader in a container
function showInlineLoader(containerId, text = 'جاري التحميل...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="inline-loader">
                <div class="loader"></div>
                <div class="loader-text">${text}</div>
            </div>
        `;
    }
}

// Add loading state to button
function setButtonLoading(button, loading = true) {
    if (!button) return;
    
    if (loading) {
        button.classList.add('btn-loading');
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// Add loading state to table
function setTableLoading(tableId, loading = true) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    if (loading) {
        table.classList.add('table-loading');
    } else {
        table.classList.remove('table-loading');
    }
}

// Create skeleton loader HTML
function createSkeletonLoader(type = 'text', count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="skeleton skeleton-${type}"></div>`;
    }
    return html;
}

// Show loading dots
function createLoadingDots() {
    return `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
}

// Export functions for global use
window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.showInlineLoader = showInlineLoader;
window.setButtonLoading = setButtonLoading;
window.setTableLoading = setTableLoading;
window.createSkeletonLoader = createSkeletonLoader;
window.createLoadingDots = createLoadingDots;
