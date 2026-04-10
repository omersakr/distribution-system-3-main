/**
 * Centralized Form Submit Handlers
 * This file contains reusable form submission handlers that prevent double-click
 * and provide consistent error handling across all detail pages
 */

/**
 * Generic payment form handler
 * Works for crushers, contractors, clients, suppliers, employees
 */
async function handlePaymentSubmit(e, form, options = {}) {
    const {
        entityId,
        entityType, // 'crusher', 'contractor', 'client', 'supplier', 'employee'
        addPaymentFn,
        updatePaymentFn,
        reloadFn,
        messageElementId = 'paymentMessage'
    } = options;

    const amount = document.getElementById('paymentAmount').value;
    const method = document.getElementById('paymentMethod').value;
    const details = document.getElementById('paymentDetails')?.value;
    const date = document.getElementById('paymentDate')?.value;
    const note = document.getElementById('paymentNote')?.value;

    const paymentData = {
        amount: parseFloat(amount),
        method,
        note
    };

    if (date) paymentData.paid_at = date;
    if (details && details.trim()) paymentData.details = details.trim();

    // Handle image upload
    const imageInput = document.getElementById('paymentImage');
    if (imageInput && imageInput.files[0]) {
        const imageFile = imageInput.files[0];

        // Validate file size (max 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
            throw new Error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
        }

        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
            throw new Error('يرجى اختيار ملف صورة صالح');
        }

        try {
            const payment_image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target.result;
                    // Check if the base64 data is too large (over 1MB when encoded)
                    if (result.length > 1024 * 1024 && typeof compressImage === 'function') {
                        compressImage(result, 0.7).then(resolve).catch(() => resolve(result));
                    } else {
                        resolve(result);
                    }
                };
                reader.onerror = () => reject(new Error('فشل في قراءة الصورة'));
                reader.readAsDataURL(imageFile);
            });
            paymentData.payment_image = payment_image;
        } catch (error) {
            throw new Error('خطأ في قراءة الصورة: ' + error.message);
        }
    }

    const editId = form.dataset.editId;

    if (editId) {
        await updatePaymentFn(editId, paymentData);
    } else {
        await addPaymentFn(entityId, paymentData);
    }

    // Show success message
    const messageElement = document.getElementById(messageElementId);
    if (messageElement) {
        messageElement.innerHTML = `<div class="alert alert-success">${editId ? 'تم تحديث الدفعة بنجاح' : 'تم إضافة الدفعة بنجاح'}</div>`;
        setTimeout(() => {
            messageElement.innerHTML = '';
        }, 3000);
    }

    // Reset form
    form.reset();
    delete form.dataset.editId;

    // Hide conditional fields
    const detailsGroup = document.getElementById('paymentDetailsGroup');
    const imageGroup = document.getElementById('paymentImageGroup');
    if (detailsGroup) detailsGroup.style.display = 'none';
    if (imageGroup) imageGroup.style.display = 'none';

    // Close modal and reload after delay
    setTimeout(() => {
        if (typeof closeModal === 'function') {
            closeModal('paymentModal');
        }
        if (reloadFn) reloadFn();
    }, 1000);
}

/**
 * Generic adjustment form handler
 * Works for crushers, contractors, clients, suppliers, employees
 */
async function handleAdjustmentSubmit(e, form, options = {}) {
    const {
        entityId,
        entityType,
        addAdjustmentFn,
        updateAdjustmentFn,
        reloadFn,
        messageElementId = 'adjustmentMessage'
    } = options;

    const type = document.getElementById('adjustmentType')?.value;
    const amountValue = parseFloat(document.getElementById('adjustmentAmount').value);
    const reason = document.getElementById('adjustmentReason')?.value;

    // Convert type to positive/negative amount
    // If type field doesn't exist, use the amount as-is (for backward compatibility)
    let amount;
    if (type) {
        amount = type === 'addition' ? amountValue : -amountValue;
    } else {
        amount = amountValue;
    }

    const adjustmentData = {
        amount: amount
    };

    if (reason) adjustmentData.reason = reason;

    const editId = form.dataset.editId;

    if (editId) {
        await updateAdjustmentFn(editId, adjustmentData);
    } else {
        await addAdjustmentFn(entityId, adjustmentData);
    }

    // Show success message
    const messageElement = document.getElementById(messageElementId);
    if (messageElement) {
        messageElement.innerHTML = `<div class="alert alert-success">${editId ? 'تم تحديث التسوية بنجاح' : 'تم إضافة التسوية بنجاح'}</div>`;
        setTimeout(() => {
            messageElement.innerHTML = '';
        }, 3000);
    }

    // Reset form
    form.reset();
    delete form.dataset.editId;

    // Close modal and reload after delay
    setTimeout(() => {
        if (typeof closeModal === 'function') {
            closeModal('adjustmentModal');
        }
        if (reloadFn) reloadFn();
    }, 1000);
}

/**
 * Setup form protection for payment and adjustment forms
 * Call this from your detail page's initialization
 */
function setupFormProtection(config) {
    const {
        entityId,
        entityType,
        addPaymentFn,
        updatePaymentFn,
        addAdjustmentFn,
        updateAdjustmentFn,
        reloadFn
    } = config;

    // Protect payment form
    if (typeof protectForm === 'function' && document.getElementById('paymentForm')) {
        protectForm('paymentForm', async (e, form) => {
            await handlePaymentSubmit(e, form, {
                entityId,
                entityType,
                addPaymentFn,
                updatePaymentFn,
                reloadFn
            });
        }, {
            loadingText: 'جاري الحفظ...',
            resetForm: false // We handle reset manually
        });
    }

    // Protect adjustment form
    if (typeof protectForm === 'function' && document.getElementById('adjustmentForm')) {
        protectForm('adjustmentForm', async (e, form) => {
            await handleAdjustmentSubmit(e, form, {
                entityId,
                entityType,
                addAdjustmentFn,
                updateAdjustmentFn,
                reloadFn
            });
        }, {
            loadingText: 'جاري الحفظ...',
            resetForm: false // We handle reset manually
        });
    }
}

// Export for global use
window.handlePaymentSubmit = handlePaymentSubmit;
window.handleAdjustmentSubmit = handleAdjustmentSubmit;
window.setupFormProtection = setupFormProtection;
