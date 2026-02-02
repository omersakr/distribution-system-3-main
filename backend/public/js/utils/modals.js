/**
 * Modal Utilities
 * Common modal management functions used across the application
 */

/**
 * Show a modal by ID
 * @param {string} modalId - ID of the modal to show
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');

        // Add body class to prevent scrolling
        document.body.classList.add('modal-open');

        // Focus on first input if available
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * Close a modal by ID
 * @param {string} modalId - ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');

        // Remove body class to restore scrolling
        document.body.classList.remove('modal-open');

        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // Clear any dataset attributes
            Object.keys(form.dataset).forEach(key => {
                delete form.dataset[key];
            });
        }

        // Clear any error messages
        const messageElements = modal.querySelectorAll('[id$="Message"]');
        messageElements.forEach(el => el.innerHTML = '');
    }
}

/**
 * Show a message in a specific element
 * @param {string} elementId - ID of the element to show message in
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success, error, info, warning)
 */
function showMessage(elementId, message, type = 'info') {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                msgDiv.innerHTML = '';
            }, 5000);
        }
    }
}

/**
 * Clear message from an element
 * @param {string} elementId - ID of the element to clear message from
 */
function clearMessage(elementId) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = '';
    }
}

/**
 * Show confirmation dialog using SweetAlert2
 * @param {string} title - Dialog title
 * @param {string} text - Dialog text
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
async function showConfirmDialog(title, text, confirmText = 'نعم', cancelText = 'إلغاء') {
    if (typeof Swal === 'undefined') {
        return confirm(`${title}\n${text}`);
    }

    const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true
    });

    return result.isConfirmed;
}

/**
 * Show success message using SweetAlert2
 * @param {string} title - Success title
 * @param {string} text - Success text
 * @param {number} timer - Auto-close timer in milliseconds
 */
async function showSuccessMessage(title, text, timer = 2000) {
    if (typeof Swal === 'undefined') {
        alert(`${title}\n${text}`);
        return;
    }

    return Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        timer: timer,
        showConfirmButton: timer === 0
    });
}

/**
 * Show error message using SweetAlert2
 * @param {string} title - Error title
 * @param {string} text - Error text
 */
async function showErrorMessage(title, text) {
    if (typeof Swal === 'undefined') {
        alert(`${title}\n${text}`);
        return;
    }

    return Swal.fire({
        icon: 'error',
        title: title,
        text: text
    });
}

/**
 * Initialize modal event listeners
 * Should be called after DOM is loaded
 */
function initializeModals() {
    // Close modals when clicking outside
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });

    // Close modals with Escape key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active, .modal[style*="block"]');
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });

    // Handle close buttons
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('close') || event.target.classList.contains('modal-close')) {
            const modal = event.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        }
    });
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModals);
} else {
    initializeModals();
}

// Export functions for global use
window.showModal = showModal;
window.closeModal = closeModal;
window.showMessage = showMessage;
window.clearMessage = clearMessage;
window.showConfirmDialog = showConfirmDialog;
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;