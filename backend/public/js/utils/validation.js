/**
 * Validation Utilities
 * Common validation functions used across the application
 */

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateRequired(value, fieldName) {
    if (!value || value.toString().trim() === '') {
        return `${fieldName} مطلوب`;
    }
    return null;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {string|null} Error message or null if valid
 */
function validateEmail(email) {
    if (!email) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'البريد الإلكتروني غير صحيح';
    }
    return null;
}

/**
 * Validate phone number (Egyptian format)
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Error message or null if valid
 */
function validatePhone(phone) {
    if (!phone) return null;

    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Egyptian phone number patterns
    const phoneRegex = /^(01[0-2,5]{1}[0-9]{8}|02[0-9]{8}|03[0-9]{7}|04[0-9]{7}|05[0-9]{7}|06[0-9]{7}|08[0-9]{7}|09[0-9]{7})$/;

    if (!phoneRegex.test(cleanPhone)) {
        return 'رقم الهاتف غير صحيح';
    }
    return null;
}

/**
 * Validate positive number
 * @param {string|number} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
function validatePositiveNumber(value, fieldName) {
    if (value === '' || value === null || value === undefined) return null;

    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
        return `${fieldName} يجب أن يكون رقم موجب`;
    }
    return null;
}

/**
 * Validate number range
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateNumberRange(value, min, max, fieldName) {
    if (value === '' || value === null || value === undefined) return null;

    const num = parseFloat(value);
    if (isNaN(num)) {
        return `${fieldName} يجب أن يكون رقم صحيح`;
    }

    if (num < min || num > max) {
        return `${fieldName} يجب أن يكون بين ${min} و ${max}`;
    }
    return null;
}

/**
 * Validate date format
 * @param {string} dateString - Date string to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateDate(dateString, fieldName) {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return `${fieldName} غير صحيح`;
    }
    return null;
}

/**
 * Validate date range (start date before end date)
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {string|null} Error message or null if valid
 */
function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
    }
    return null;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateStringLength(value, minLength, maxLength, fieldName) {
    if (!value) return null;

    if (value.length < minLength) {
        return `${fieldName} يجب أن يكون على الأقل ${minLength} أحرف`;
    }

    if (value.length > maxLength) {
        return `${fieldName} يجب أن يكون أقل من ${maxLength} حرف`;
    }

    return null;
}

/**
 * Validate form using validation rules
 * @param {HTMLFormElement} form - Form element to validate
 * @param {object} rules - Validation rules object
 * @returns {object} Validation result {isValid: boolean, errors: object}
 */
function validateForm(form, rules) {
    const errors = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        const value = field.value;
        const fieldRules = rules[fieldName];

        // Check each rule for the field
        fieldRules.forEach(rule => {
            if (errors[fieldName]) return; // Skip if already has error

            let error = null;

            switch (rule.type) {
                case 'required':
                    error = validateRequired(value, rule.message || fieldName);
                    break;
                case 'email':
                    error = validateEmail(value);
                    break;
                case 'phone':
                    error = validatePhone(value);
                    break;
                case 'positiveNumber':
                    error = validatePositiveNumber(value, rule.message || fieldName);
                    break;
                case 'numberRange':
                    error = validateNumberRange(value, rule.min, rule.max, rule.message || fieldName);
                    break;
                case 'date':
                    error = validateDate(value, rule.message || fieldName);
                    break;
                case 'stringLength':
                    error = validateStringLength(value, rule.min, rule.max, rule.message || fieldName);
                    break;
                case 'custom':
                    error = rule.validator(value, form);
                    break;
            }

            if (error) {
                errors[fieldName] = error;
                isValid = false;
            }
        });
    });

    return { isValid, errors };
}

/**
 * Display validation errors on form
 * @param {HTMLFormElement} form - Form element
 * @param {object} errors - Errors object from validateForm
 */
function displayFormErrors(form, errors) {
    // Clear previous errors
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    // Display new errors
    Object.keys(errors).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('error');

            const errorDiv = createElement('div', 'field-error', errors[fieldName]);
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        }
    });
}

/**
 * Clear form validation errors
 * @param {HTMLFormElement} form - Form element
 */
function clearFormErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

// Export functions for global use
window.validateRequired = validateRequired;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validatePositiveNumber = validatePositiveNumber;
window.validateNumberRange = validateNumberRange;
window.validateDate = validateDate;
window.validateDateRange = validateDateRange;
window.validateStringLength = validateStringLength;
window.validateForm = validateForm;
window.displayFormErrors = displayFormErrors;
window.clearFormErrors = clearFormErrors;