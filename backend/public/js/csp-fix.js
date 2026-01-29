// CSP Compliance - Event Delegation System
// This file removes the need for inline event handlers

document.addEventListener('DOMContentLoaded', function () {
    // Global event delegation for CSP compliance
    document.addEventListener('click', function (e) {
        // Handle modal close buttons
        if (e.target.classList.contains('modal-close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                if (typeof closeModal === 'function') {
                    closeModal(modal.id);
                } else {
                    modal.style.display = 'none';
                }
            }
        }

        // Handle cancel buttons in modals
        if (e.target.textContent === 'إلغاء' && e.target.classList.contains('btn-secondary')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                if (typeof closeModal === 'function') {
                    closeModal(modal.id);
                } else {
                    modal.style.display = 'none';
                }
            }
        }

        // Handle CRUD buttons (Edit/Delete) using data attributes
        if (e.target.classList.contains('crud-btn')) {
            const button = e.target;
            const action = button.getAttribute('data-action');
            const type = button.getAttribute('data-type');
            const id = button.getAttribute('data-id'); // Keep as string for MongoDB ObjectIds

            console.log('CRUD button clicked:', { action, type, id });

            if (action && type && id) {
                e.preventDefault();

                // Handle edit actions
                if (action === 'edit') {
                    if (type === 'payment' && typeof window.editPayment === 'function') {
                        console.log('Calling editPayment with ID:', id);
                        window.editPayment(id);
                    } else if (type === 'adjustment' && typeof window.editAdjustment === 'function') {
                        console.log('Calling editAdjustment with ID:', id);
                        window.editAdjustment(id);
                    } else if (type === 'delivery' && typeof window.editDelivery === 'function') {
                        console.log('Calling editDelivery with ID:', id);
                        window.editDelivery(id);
                    }
                }

                // Handle delete actions
                if (action === 'delete') {
                    if (type === 'payment' && typeof window.deletePayment === 'function') {
                        console.log('Calling deletePayment with ID:', id);
                        window.deletePayment(id);
                    } else if (type === 'adjustment' && typeof window.deleteAdjustment === 'function') {
                        console.log('Calling deleteAdjustment with ID:', id);
                        window.deleteAdjustment(id);
                    } else if (type === 'delivery' && typeof window.deleteDelivery === 'function') {
                        console.log('Calling deleteDelivery with ID:', id);
                        window.deleteDelivery(id);
                    }
                }
            }
        }

        // Handle report generation buttons
        if (e.target.textContent == ('إنشاء تقرير التوريدات') || e.target.textContent == ('إنشاء تقرير المشاوير')) {
            if (typeof generateDeliveriesReport === 'function') {
                generateDeliveriesReport();
            }
        }

        if (e.target.textContent == ('إنشاء كشف الحساب')) {
            if (typeof generateAccountStatement === 'function') {
                generateAccountStatement();
            }
        }

        // Handle filter clear buttons
        if (e.target.textContent === 'مسح الفلاتر') {
            const section = e.target.closest('[id*="Section"]') || e.target.closest('.section');
            if (section) {
                const sectionId = section.id;
                if (sectionId.includes('deliveries') && typeof clearDeliveriesFilters === 'function') {
                    clearDeliveriesFilters();
                } else if (sectionId.includes('payments') && typeof clearPaymentsFilters === 'function') {
                    clearPaymentsFilters();
                } else if (sectionId.includes('adjustments') && typeof clearAdjustmentsFilters === 'function') {
                    clearAdjustmentsFilters();
                }
            }
        }

        // Handle date range toggle
        if (e.target.id === 'useCustomDateRange' && typeof toggleDateInputs === 'function') {
            toggleDateInputs();
        }
    });

    // Handle change events for date range checkbox
    document.addEventListener('change', function (e) {
        if (e.target.id === 'useCustomDateRange' && typeof toggleDateInputs === 'function') {
            toggleDateInputs();
        }
    });
});

// Utility functions for modal management
if (typeof showModal === 'undefined') {
    window.showModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    };
}

if (typeof closeModal === 'undefined') {
    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    };
}

// Make functions globally available
window.showModal = showModal;
window.closeModal = closeModal;